
import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import db from '../db.js'

const sessions = new Map() // sid -> userId (server-side, so logout truly invalidates it)
const COOKIE = 'sid'

function readCookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='))
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null
}

export function getSessionUserId(req) {
  const sid = readCookie(req, COOKIE)
  return sid ? sessions.get(sid) ?? null : null
}

export const devRouter = Router()
devRouter.post('/login', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.body?.userId)
  if (!user) return res.status(404).json({ error: 'not_found', message: 'Unknown user.' })
  const sid = randomBytes(32).toString('hex')
  sessions.set(sid, user.id)
  res.setHeader('Set-Cookie', `${COOKIE}=${sid}; HttpOnly; SameSite=Lax; Path=/`)
  res.json({ ok: true })
})

// Server-side logout: destroys the session, then expires the cookie.
export function logout(req, res) {
  const sid = readCookie(req, COOKIE)
  if (sid) sessions.delete(sid)
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`)
  res.json({ ok: true })
}
