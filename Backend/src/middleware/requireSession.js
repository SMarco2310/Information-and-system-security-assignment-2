// checks if there is a valid session and who it belongs to
// The user id comes only from the server-side session. The role is re-read from
// the database on every request, never from the cookie, URL or request body.
import db from '../db.js'
import { unauthenticated } from '../lib/deny.js'
// Contract: getSessionUserId(req) returns the user id string, or null if no valid session.
import { getSessionUserId } from '../session.js'

const findUser = db.prepare('SELECT id, name, role FROM users WHERE id = ?')

export function requireSession(req, res, next) {
  const userId = getSessionUserId(req)
  const user = userId ? findUser.get(userId) : null
  if (!user) return unauthenticated(res)
  req.user = { id: user.id, name: user.name, role: user.role }
  next()
}
