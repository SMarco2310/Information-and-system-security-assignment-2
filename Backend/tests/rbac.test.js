// Automated evidence for T2-T6. Uses a throwaway database, so your portal.db is untouched.
// Run with: npm test
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'rbac-'))
process.env.DB_PATH = join(dir, 'test.db')
await import('../src/seed.js')
const { app } = await import('../src/app.js')
const db = (await import('../src/db.js')).default
const { createSession } = await import('../src/session.js')

let server, base
before(async () => {
  server = await new Promise(r => { const s = app.listen(0, () => r(s)) })
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.closeAllConnections()
  server.close()
  db.close() // release the SQLite file so Windows allows deleting it
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    // Leftover temp folder is harmless; the OS clears it eventually
  }
})

const S1 = 'S1042', S2 = 'S1043', L1 = 'L201', L2 = 'L202'

// Real passkey login needs a browser, so tests create a server session directly.
// There is no dev login route in the app.
async function login(userId) {
  return `sid=${createSession(userId)}`
}
const call = (path, { cookie, method = 'GET', body } = {}) => fetch(base + path, {
  method,
  headers: { ...(cookie && { cookie }), ...(body && { 'Content-Type': 'application/json' }) },
  body: body && JSON.stringify(body)
})
const gradeOf = (sid, code) => ({ ...db.prepare(
  'SELECT coursework, exam FROM grades WHERE student_id = ? AND course_code = ?').get(sid, code) })

test('T2: S1 can view S1 grades (allowed)', async () => {
  const cookie = await login(S1)
  const me = await (await call('/api/me', { cookie })).json()
  assert.equal(me.id, S1)
  const res = await call(`/api/students/${S1}/grades`, { cookie })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.studentId, S1)
  assert.equal(body.grades.length, 3)
})

test('T3: S1 requesting S2 grades is denied with no S2 data', async () => {
  const cookie = await login(S1)
  const res = await call(`/api/students/${S2}/grades`, { cookie })
  const text = await res.text()
  assert.equal(res.status, 403)
  assert.ok(!text.includes('Ben Carter') && !text.includes(S2) && !text.includes('coursework'))
  // Same answer for a student that does not exist, so IDs cannot be probed
  const ghost = await call('/api/students/S9999/grades', { cookie })
  assert.equal(ghost.status, 403)
  assert.equal(await ghost.text(), text)
})

test('T4: S1 editing a grade is denied and the database is unchanged', async () => {
  const cookie = await login(S1)
  const before = gradeOf(S1, 'CS310')
  for (const sid of [S1, S2]) {
    const res = await call(`/api/courses/CS310/grades/${sid}`, { cookie, method: 'PUT', body: { coursework: 100, exam: 100 } })
    assert.equal(res.status, 403)
  }
  assert.equal((await call('/api/courses/CS310/roster', { cookie })).status, 403)
  assert.equal((await call('/api/courses', { cookie })).status, 403)
  assert.deepEqual(gradeOf(S1, 'CS310'), before)
})

test('T5: L1 updates a grade in the assigned course and it persists', async () => {
  const cookie = await login(L1)
  const res = await call(`/api/courses/CS310/grades/${S1}`, { cookie, method: 'PUT', body: { coursework: 91, exam: 92 } })
  assert.equal(res.status, 200)
  const roster = await (await call('/api/courses/CS310/roster', { cookie })).json()
  const row = roster.students.find(s => s.studentId === S1)
  assert.deepEqual([row.coursework, row.exam], [91, 92])
  assert.deepEqual(gradeOf(S1, 'CS310'), { coursework: 91, exam: 92 })
})

test('T5 (course assignment): a lecturer cannot touch a course that is not theirs', async () => {
  const l2 = await login(L2)
  const l1 = await login(L1)
  const before1 = gradeOf(S1, 'CS310'), before2 = gradeOf(S1, 'MA201')
  assert.equal((await call(`/api/courses/CS310/grades/${S1}`, { cookie: l2, method: 'PUT', body: { coursework: 1, exam: 1 } })).status, 403)
  assert.equal((await call('/api/courses/CS310/roster', { cookie: l2 })).status, 403)
  assert.equal((await call(`/api/courses/MA201/grades/${S1}`, { cookie: l1, method: 'PUT', body: { coursework: 1, exam: 1 } })).status, 403)
  assert.deepEqual(gradeOf(S1, 'CS310'), before1)
  assert.deepEqual(gradeOf(S1, 'MA201'), before2)
})

test('Least privilege: a lecturer sees only their own courses for a student', async () => {
  const body = await (await call(`/api/students/${S1}/grades`, { cookie: await login(L2) })).json()
  assert.deepEqual(body.grades.map(g => g.code), ['MA201'])
})

test('Input validation rejects bad scores', async () => {
  const cookie = await login(L1)
  for (const bad of [{ coursework: 101, exam: 50 }, { coursework: 'abc', exam: 50 }, { coursework: 50 }, { coursework: 50.5, exam: 50 }]) {
    assert.equal((await call(`/api/courses/CS310/grades/${S1}`, { cookie, method: 'PUT', body: bad })).status, 400)
  }
})

test('T6: protected endpoints are denied without a session and after logout', async () => {
  const protectedCalls = [
    ['/api/me'], [`/api/students/${S1}/grades`], ['/api/courses'], ['/api/courses/CS310/roster'],
    ['/api/courses/CS310/grades/' + S1, 'PUT', { coursework: 50, exam: 50 }]
  ]
  for (const [path, method, body] of protectedCalls) {
    assert.equal((await call(path, { method, body })).status, 401, `no session: ${path}`)
  }
  const cookie = await login(S1)
  assert.equal((await call('/api/me', { cookie })).status, 200)
  await call('/api/logout', { cookie, method: 'POST' })
  for (const [path, method, body] of protectedCalls) {
    assert.equal((await call(path, { cookie, method, body })).status, 401, `after logout: ${path}`)
  }
})
