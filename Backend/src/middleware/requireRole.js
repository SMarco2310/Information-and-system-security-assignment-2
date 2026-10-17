// checks if role is allowed to use this endpoint? Deny by default.
import { deny } from '../lib/deny.js'

export const requireRole = (...allowed) => (req, res, next) =>
  allowed.includes(req.user?.role) ? next() : deny(res)
