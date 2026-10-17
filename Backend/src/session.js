// Server-side sessions. A login creates one, a logout destroys it.
// The cookie only holds a random token; the user id stays on the server.
import crypto from 'node:crypto'

const sessions = new Map() // token -> userId
const COOKIE = 'sid'
const EIGHT_HOURS = 8 * 60 * 60 * 1000

function readCookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null
}

// Used by requireSession: the user id for this request, or null if not logged in
export function getSessionUserId(req) {
  const token = readCookie(req, COOKIE)
  return token ? sessions.get(token) ?? null : null
}

// Logs a user in: remember the session and send the cookie
export function startSession(res, userId) {
  const token = createSession(userId)
  res.cookie(COOKIE, token, {
    httpOnly: true,                                  // JavaScript cannot read it
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',   // HTTPS only in production
    maxAge: EIGHT_HOURS
  })
}

// Logs a user out: forget the session and clear the cookie
export function endSession(req, res) {
  const token = readCookie(req, COOKIE)
  if (token) sessions.delete(token)
  res.clearCookie(COOKIE)
}

// Makes a session without a response (the automated tests use this)
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url')
  sessions.set(token, userId)
  return token
}
