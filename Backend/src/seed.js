import 'dotenv/config'
import crypto from 'node:crypto'
import db from './db.js'

// Setup script: fills the database with fake users, courses and grades, and
// makes a one-time enrolment code for each user.
// Running it again wipes the tables and starts over (this also removes passkeys).

db.exec(`
  DELETE FROM grades;
  DELETE FROM courses;
  DELETE FROM enrolment_codes;
  DELETE FROM credentials;
  DELETE FROM users;
`)

const students = [
  ['S1042', 'Amina Yusuf'], ['S1043', 'Ben Carter'], ['S1044', 'Chloe Nguyen'],
  ['S1045', 'Dev Patel'], ['S1046', 'Elena Rossi']
]
const lecturers = [['L201', 'Dr. Daniel Okafor'], ['L202', 'Prof. Li Tan']]
const courses = [
  ['CS310', 'Information Security', '2025 / Sem 2', 4, 'L201'],
  ['CS240', 'Data Structures', '2025 / Sem 2', 4, 'L201'],
  ['MA201', 'Discrete Mathematics', '2025 / Sem 1', 3, 'L202']
]

const insertUser = db.prepare('INSERT INTO users (id, name, role) VALUES (?, ?, ?)')
const insertCourse = db.prepare('INSERT INTO courses (code, title, semester, credits, lecturer_id) VALUES (?, ?, ?, ?, ?)')
const insertGrade = db.prepare('INSERT INTO grades (student_id, course_code, coursework, exam) VALUES (?, ?, ?, ?)')
const insertCode = db.prepare('INSERT INTO enrolment_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)')

const codesToShow = []

// A transaction makes all the inserts succeed or fail together
db.transaction(() => {
  students.forEach(([id, name]) => insertUser.run(id, name, 'student'))
  lecturers.forEach(([id, name]) => insertUser.run(id, name, 'lecturer'))
  courses.forEach(c => insertCourse.run(...c))

  // Every student is enrolled in every course
  students.forEach(([id], i) => {
    courses.forEach(([code], j) => insertGrade.run(id, code, 50 + ((i * 9 + j * 5) % 45), 40 + ((i * 7 + j * 11) % 55)))
  })

  // One-time enrolment codes (valid for 24 hours). Only a hash is stored.
  const people = [
    ...students.map(([id, name]) => ({ id, name, role: 'student' })),
    ...lecturers.map(([id, name]) => ({ id, name, role: 'lecturer' }))
  ]
  for (const u of people) {
    const code = crypto.randomBytes(8).toString('hex').match(/.{4}/g).join('-') // like 06a9-f979-c858-7efd
    const codeHash = crypto.createHash('sha256').update(code).digest('hex')
    insertCode.run(u.id, codeHash, Date.now() + 24 * 60 * 60 * 1000)
    codesToShow.push({ user: u.id, name: u.name, role: u.role, 'enrolment code': code })
  }
})()

console.log('Seeded:', db.prepare('SELECT COUNT(*) AS n FROM grades').get().n, 'grades')
console.log('\nOne-time enrolment codes (shown only now, do not share or commit):')
console.table(codesToShow)
