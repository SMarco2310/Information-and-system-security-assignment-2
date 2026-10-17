import 'dotenv/config'
import crypto from 'node:crypto'
import db from './db.js'

// Setup script for the DEMONSTRATION bootstrap. It pre-provisions three fictional
// accounts (two students, one lecturer), one mock course and one-time enrolment
// codes. Users never choose their own role or identity: both come from this script.

const users = [
  { id: 'S1042', name: 'Amina Yusuf', role: 'student' },   // "S1" in the brief
  { id: 'S1043', name: 'Ben Carter', role: 'student' },    // "S2"
  { id: 'L201', name: 'Dr. Daniel Okafor', role: 'lecturer' } // "L1"
]
const course = { code: 'CS310', title: 'Information Security', semester: '2025 / Sem 2', credits: 4, lecturerId: 'L201' }
const grades = [
  { studentId: 'S1042', coursework: 72, exam: 65 },
  { studentId: 'S1043', coursework: 58, exam: 49 }
]

const CODE_TTL_MS = 24 * 60 * 60 * 1000
const hashCode = code => crypto.createHash('sha256').update(code).digest('hex')
const newCode = () => crypto.randomBytes(8).toString('hex').match(/.{4}/g).join('-')

const issued = []

db.transaction(() => {
  // Reset mock records (passkeys already registered for these users are kept)
  db.prepare('DELETE FROM grades').run()
  db.prepare('DELETE FROM courses').run()
  const keep = users.map(u => u.id)
  const marks = keep.map(() => '?').join(',')
  db.prepare(`DELETE FROM enrolment_codes WHERE user_id NOT IN (${marks})`).run(...keep)
  db.prepare(`DELETE FROM credentials WHERE user_id NOT IN (${marks})`).run(...keep)
  db.prepare(`DELETE FROM users WHERE id NOT IN (${marks})`).run(...keep)

  const upsertUser = db.prepare(`
    INSERT INTO users (id, name, role) VALUES (@id, @name, @role)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, role = excluded.role`)
  users.forEach(u => upsertUser.run(u))

  db.prepare('INSERT INTO courses (code, title, semester, credits, lecturer_id) VALUES (?, ?, ?, ?, ?)')
    .run(course.code, course.title, course.semester, course.credits, course.lecturerId)

  const insertGrade = db.prepare('INSERT INTO grades (student_id, course_code, coursework, exam) VALUES (?, ?, ?, ?)')
  grades.forEach(g => insertGrade.run(g.studentId, course.code, g.coursework, g.exam))

  // Fresh one-time code for every user who has not registered a passkey yet
  const hasPasskey = db.prepare('SELECT 1 FROM credentials WHERE user_id = ?')
  const upsertCode = db.prepare(`
    INSERT INTO enrolment_codes (user_id, code_hash, expires_at, used_at) VALUES (?, ?, ?, NULL)
    ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, used_at = NULL`)
  for (const u of users) {
    if (hasPasskey.get(u.id)) continue
    const code = newCode()
    upsertCode.run(u.id, hashCode(code), Date.now() + CODE_TTL_MS)
    issued.push({ user: u.id, name: u.name, role: u.role, 'enrolment code': code })
  }
})()

console.log(`Seeded ${users.length} users, 1 course (${course.code}), ${grades.length} grades.`)
if (issued.length) {
  console.log('\nOne-time enrolment codes (valid 24h, shown once, stored only as a hash).')
  console.log('Do not commit or share these:')
  console.table(issued)
} else {
  console.log('All users already have a passkey; no new enrolment codes issued.')
}
