import 'dotenv/config'
import db from './db.js'

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

const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, name, role) VALUES (?, ?, ?)')
const insertCourse = db.prepare('INSERT OR REPLACE INTO courses (code, title, semester, credits, lecturer_id) VALUES (?, ?, ?, ?, ?)')
const insertGrade = db.prepare('INSERT OR REPLACE INTO grades (student_id, course_code, coursework, exam) VALUES (?, ?, ?, ?)')

// A transaction makes all the inserts succeed or fail together (and is much faster)
db.transaction(() => {
  students.forEach(([id, name]) => insertUser.run(id, name, 'student'))
  lecturers.forEach(([id, name]) => insertUser.run(id, name, 'lecturer'))
  courses.forEach(c => insertCourse.run(...c))
  students.forEach(([id], i) => {
    courses.forEach(([code], j) => insertGrade.run(id, code, 50 + ((i * 9 + j * 5) % 45), 40 + ((i * 7 + j * 11) % 55)))
  })
})()

console.log('Seeded:', db.prepare('SELECT COUNT(*) AS n FROM grades').get().n, 'grades')
