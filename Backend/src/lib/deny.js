// makes every denial look the same so it never reveals whether another user's record exists or what it contains.

export function unauthenticated(res) {
  return res.status(401).json({ error: 'unauthenticated', message: 'Please sign in to continue.' })
}

export function deny(res) {
  return res.status(403).json({ error: 'forbidden', message: 'You do not have access to this resource.' })
}
