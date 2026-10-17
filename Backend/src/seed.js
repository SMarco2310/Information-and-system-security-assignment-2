import 'dotenv/config'
import crypto from 'node:crypto'
import db from './db.js'

// Setup script: fills the database with fake users, one course and grades,
// and makes a one-time enrolment code for each user.
// Running it again wipes the tables and starts over (this also removes passkeys).

db.exec(`
  DELETE FROM grades;
  DELETE FROM courses;
  DELETE FROM enrolment_codes;
  DELETE FROM credentials;
  DELETE FROM users;
`)

// Two students and one lecturer (S1, S2 and L1 in the assignment)
const users = [
  { id: 'S1042', name: 'Amina Yusuf', role: 'student' },
  { id: 'S1043', name: 'Ben Carter', role: 'student' },
  { id: 'L201', name: 'Dr. Daniel Okafor', role: 'lecturer' }
]
for (const u of users) {
  db.prepare('INSERT INTO users (id, name, role) VALUES (?, ?, ?)').run(u.id, u.name, u.role)
}

// One course, taught by the lecturer
db.prepare('INSERT INTO courses (code, title, semester, credits, lecturer_id) VALUES (?, ?, ?, ?, ?)')
  .run('CS310', 'Information Security', '2025 / Sem 2', 4, 'L201')

// Both students are enrolled in it
db.prepare('INSERT INTO grades (student_id, course_code, coursework, exam) VALUES (?, ?, ?, ?)')
  .run('S1042', 'CS310', 72, 65)
db.prepare('INSERT INTO grades (student_id, course_code, coursework, exam) VALUES (?, ?, ?, ?)')
  .run('S1043', 'CS310', 58, 49)

// One-time enrolment codes (valid for 24 hours)
const codesToShow = []
for (const u of users) {
  // random code like "06a9-f979-c858-7efd"
  const code = crypto.randomBytes(8).toString('hex').match(/.{4}/g).join('-')
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  const expires = Date.now() + 24 * 60 * 60 * 1000

  db.prepare('INSERT INTO enrolment_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)')
    .run(u.id, codeHash, expires)

  codesToShow.push({ user: u.id, name: u.name, role: u.role, 'enrolment code': code })
}

console.log('Seeded 3 users, 1 course and 2 grades.')
console.log('\nOne-time enrolment codes (shown only now, do not share or commit):')
console.table(codesToShow)
