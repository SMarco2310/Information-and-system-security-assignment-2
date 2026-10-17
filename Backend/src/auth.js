import crypto from 'node:crypto'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server'
import db from './db.js'

// ---- Relying party configuration -------------------------------------------
// The browser binds every passkey to the RP ID (the site's domain). A phishing
// site on another domain therefore cannot obtain a valid assertion.
const ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000'
const RP_ID = process.env.RP_ID || new URL(ORIGIN).hostname
const RP_NAME = 'University Grade Portal'
// Require the authenticator to verify the user (biometric / PIN). Set REQUIRE_UV=false to relax.
const REQUIRE_UV = process.env.REQUIRE_UV !== 'false'
const UV = REQUIRE_UV ? 'required' : 'preferred'

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const COOKIE = 'sid'

const sha256 = v => crypto.createHash('sha256').update(v).digest('hex')

// ---- Challenge store: create, then consume exactly once ----------------------
function saveChallenge(challenge, type, userId = null) {
  db.prepare('DELETE FROM challenges WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO challenges (challenge, type, user_id, expires_at) VALUES (?, ?, ?, ?)')
    .run(challenge, type, userId, Date.now() + CHALLENGE_TTL_MS)
}

// The browser echoes our challenge inside clientDataJSON. We look it up and DELETE
// it in one atomic statement, so a challenge can never be used twice.
function consumeChallenge(response, type) {
  let challenge
  try {
    const json = Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8')
    challenge = JSON.parse(json).challenge
  } catch {
    return null
  }
  if (typeof challenge !== 'string') return null
  const row = db.prepare(
    'DELETE FROM challenges WHERE challenge = ? AND type = ? AND expires_at > ? RETURNING challenge, user_id'
  ).get(challenge, type, Date.now())
  return row ? { challenge: row.challenge, userId: row.user_id } : null
}

// ---- Sessions ------------------------------------------------------------------
function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(sha256(token), userId, Date.now() + SESSION_TTL_MS)
  res.cookie(COOKIE, token, {
    httpOnly: true,                                   // not readable from JavaScript
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',    // HTTPS only in production
    maxAge: SESSION_TTL_MS,
    path: '/'
  })
}

/** Middleware: loads the user from the session cookie, or answers 401. Reused by RBAC routes. */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE]
  const user = token && db.prepare(`
    SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?`).get(sha256(token), Date.now())
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' })
  req.user = user
  next()
}

// ---- Enrolment code check (constant-time) -----------------------------------------
function codeIsValid(userId, code) {
  const row = db.prepare('SELECT code_hash, expires_at, used_at FROM enrolment_codes WHERE user_id = ?').get(userId)
  if (!row || row.used_at || row.expires_at < Date.now()) return false
  const given = Buffer.from(sha256(String(code).trim().toLowerCase()), 'hex')
  return crypto.timingSafeEqual(given, Buffer.from(row.code_hash, 'hex'))
}

const limiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false })
const auth = Router()
auth.use(limiter)

// ============================ REGISTRATION (enrolment) ============================
// Step 1: user proves they hold the one-time code for THEIR pre-provisioned account.
// The server decides the identity and role from the database; the client chooses neither.
auth.post('/register/options', async (req, res) => {
  const { userId, code } = req.body ?? {}
  const user = typeof userId === 'string' && db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId)
  // One generic message for unknown user / wrong code / used / expired: no user enumeration.
  if (!user || typeof code !== 'string' || !codeIsValid(user.id, code)) {
    return res.status(403).json({ error: 'Invalid or expired enrolment code.' })
  }

  const existing = db.prepare('SELECT id, transports FROM credentials WHERE user_id = ?').all(user.id)
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.id,
    userDisplayName: user.name,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: existing.map(c => ({ id: c.id, transports: c.transports ? JSON.parse(c.transports) : undefined })),
    authenticatorSelection: { residentKey: 'required', userVerification: UV }
  })
  saveChallenge(options.challenge, 'register', user.id)
  res.json(options)
})

// Step 2: verify the authenticator's response, then store the PUBLIC key only.
auth.post('/register/verify', async (req, res) => {
  const challenge = consumeChallenge(req.body, 'register')
  if (!challenge) return res.status(400).json({ error: 'Registration expired. Please start again.' })

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: REQUIRE_UV
    })
  } catch {
    return res.status(400).json({ error: 'Passkey could not be verified.' })
  }
  if (!verification.verified) return res.status(400).json({ error: 'Passkey could not be verified.' })

  const { credential } = verification.registrationInfo
  const finish = db.transaction(() => {
    // Burn the one-time code atomically: only the first success wins.
    const used = db.prepare('UPDATE enrolment_codes SET used_at = ? WHERE user_id = ? AND used_at IS NULL')
      .run(Date.now(), challenge.userId)
    if (used.changes === 0) return false
    db.prepare('INSERT INTO credentials (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)')
      .run(credential.id, challenge.userId, Buffer.from(credential.publicKey), credential.counter,
        JSON.stringify(credential.transports ?? []))
    return true
  })
  if (!finish()) return res.status(403).json({ error: 'Invalid or expired enrolment code.' })
  res.json({ verified: true })
})

// ================================== LOGIN ==================================
// Step 1: fresh random challenge. No username needed: the passkey itself identifies the user.
auth.post('/login/options', async (_req, res) => {
  const options = await generateAuthenticationOptions({ rpID: RP_ID, userVerification: UV })
  saveChallenge(options.challenge, 'login')
  res.json(options)
})

// Step 2: verify the signed assertion with the stored public key. Session only after success.
auth.post('/login/verify', async (req, res) => {
  const denied = () => res.status(401).json({ error: 'Sign-in failed. Use a passkey registered for this portal.' })

  const challenge = consumeChallenge(req.body, 'login')
  if (!challenge) return denied()

  const stored = typeof req.body?.id === 'string' &&
    db.prepare('SELECT id, user_id, public_key, counter, transports FROM credentials WHERE id = ?').get(req.body.id)
  if (!stored) return denied()                           // unregistered passkey (T7)

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenge.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: REQUIRE_UV,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(stored.public_key),
        counter: stored.counter,
        transports: stored.transports ? JSON.parse(stored.transports) : undefined
      }
    })
  } catch {
    return denied()
  }
  if (!verification.verified) return denied()

  db.prepare('UPDATE credentials SET counter = ? WHERE id = ?')
    .run(verification.authenticationInfo.newCounter, stored.id)
  startSession(res, stored.user_id)
  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(stored.user_id)
  res.json({ user })
})

// ============================ SESSION ============================
auth.get('/me', requireAuth, (req, res) => res.json({ user: req.user }))

auth.post('/logout', (req, res) => {
  const token = req.cookies?.[COOKIE]
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token))
  res.clearCookie(COOKIE, { path: '/' })
  res.json({ ok: true })
})

export default auth
