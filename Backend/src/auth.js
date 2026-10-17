import crypto from 'node:crypto'
import { Router } from 'express'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server'
import db from './db.js'

const router = Router()

// ---------- Settings ----------
// The passkey is tied to this website address. A fake site cannot use it.
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:3000'
const rpID = 'localhost'
const rpName = 'University Grade Portal'

// ---------- Temporary memory (cleared when the server restarts) ----------
const challenges = new Map() // challenge text -> { type, userId, expires }
const sessions = new Map()   // session token -> userId

const sha256 = text => crypto.createHash('sha256').update(text).digest('hex')

function saveChallenge(challenge, type, userId) {
  challenges.set(challenge, { type, userId, expires: Date.now() + 5 * 60 * 1000 })
}

// Finds the challenge the browser answered and DELETES it,
// so the same challenge can never be used twice.
function useChallenge(body, type) {
  let challenge
  try {
    const clientData = Buffer.from(body.response.clientDataJSON, 'base64url').toString()
    challenge = JSON.parse(clientData).challenge
  } catch {
    return null
  }
  const saved = challenges.get(challenge)
  challenges.delete(challenge)
  if (!saved || saved.type !== type || saved.expires < Date.now()) return null
  return { challenge, userId: saved.userId }
}

// Logs a user in: makes a random session token and sends it as a cookie
function startSession(res, userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  sessions.set(token, userId)
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 })
}

// ---------- Check that the user is logged in (used by other routes later) ----------
export function requireLogin(req, res, next) {
  const userId = sessions.get(req.cookies.sid)
  const user = userId && db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(userId)
  if (!user) {
    return res.status(401).json({ error: 'Please sign in to continue.' })
  }
  req.user = user
  next()
}

// =============== REGISTER A PASSKEY ===============

// Step 1: the user sends their ID and one-time code. If the code is right,
// we send back options for the browser to create a passkey.
router.post('/register/options', async (req, res) => {
  const { userId, code } = req.body

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(String(userId))
  const saved = user && db.prepare('SELECT * FROM enrolment_codes WHERE user_id = ?').get(user.id)
  const codeIsGood = saved && !saved.used && saved.expires_at > Date.now() &&
    saved.code_hash === sha256(String(code).trim().toLowerCase())

  // Same message for every failure, so nobody can find out which IDs exist
  if (!codeIsGood) {
    return res.status(403).json({ error: 'Invalid or expired enrolment code.' })
  }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.id,
    userDisplayName: `${user.name} (${user.role})`,   // shown in the passkey list on the device
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' }
  })

  saveChallenge(options.challenge, 'register', user.id)

  // Also tell the page whose account this is. The name and role come from the
  // database (set by the setup script); the user cannot choose them.
  res.json({ ...options, account: { name: user.name, role: user.role } })
})

// Step 2: the browser sends back the new passkey. We check it and save the PUBLIC key.
router.post('/register/verify', async (req, res) => {
  const saved = useChallenge(req.body, 'register')
  if (!saved) {
    return res.status(400).json({ error: 'Registration expired. Please start again.' })
  }

  let result
  try {
    result = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: saved.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true
    })
  } catch {
    return res.status(400).json({ error: 'Passkey could not be verified.' })
  }
  if (!result.verified) {
    return res.status(400).json({ error: 'Passkey could not be verified.' })
  }

  const passkey = result.registrationInfo.credential
  db.prepare('INSERT INTO credentials (id, user_id, public_key, counter, transports) VALUES (?, ?, ?, ?, ?)')
    .run(passkey.id, saved.userId, Buffer.from(passkey.publicKey), passkey.counter,
      JSON.stringify(passkey.transports || []))

  // The code can only be used once
  db.prepare('UPDATE enrolment_codes SET used = 1 WHERE user_id = ?').run(saved.userId)

  // The new passkey was just verified, so log the user straight in
  startSession(res, saved.userId)
  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(saved.userId)
  res.json({ verified: true, user })
})

// =============== LOG IN WITH A PASSKEY ===============

// Step 1: send the browser a fresh random challenge to sign
router.post('/login/options', async (req, res) => {
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' })
  saveChallenge(options.challenge, 'login', null)
  res.json(options)
})

// Step 2: check the signed challenge with the public key we saved earlier
router.post('/login/verify', async (req, res) => {
  const failed = () => res.status(401).json({ error: 'Sign-in failed. Use a passkey registered for this portal.' })

  const saved = useChallenge(req.body, 'login')
  if (!saved) return failed()

  // Do we know this passkey?
  const passkey = db.prepare('SELECT * FROM credentials WHERE id = ?').get(String(req.body.id))
  if (!passkey) return failed()

  let result
  try {
    result = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: saved.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.public_key),
        counter: passkey.counter,
        transports: JSON.parse(passkey.transports || '[]')
      }
    })
  } catch {
    return failed()
  }
  if (!result.verified) return failed()

  // Remember the new counter (helps spot cloned passkeys)
  db.prepare('UPDATE credentials SET counter = ? WHERE id = ?')
    .run(result.authenticationInfo.newCounter, passkey.id)

  // Only now do we log the user in
  startSession(res, passkey.user_id)

  const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(passkey.user_id)
  res.json({ user })
})

// =============== WHO AM I / LOG OUT ===============

router.get('/me', requireLogin, (req, res) => {
  res.json({ user: req.user })
})

router.post('/logout', (req, res) => {
  sessions.delete(req.cookies.sid)
  res.clearCookie('sid')
  res.json({ ok: true })
})

export default router
