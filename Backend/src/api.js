import { Router } from 'express'
import db from './db.js'

const api = Router()

// TEMPORARY: these read routes trust the id in the URL and do no authentication.
// Replace with a session check (user from the verified session, role + ownership
// enforced in the query) before this goes anywhere near a real login.

// A student's grades
api.get('/students/:id/grades', (req, res) => {
  const rows = db.prepare(`
    SELECT c.code, c.title, c.credits, c.semester, u.name AS lecturer,
           g.coursework, g.exam
    FROM grades g
    JOIN courses c ON c.code = g.course_code
    JOIN users u ON u.id = c.lecturer_id
    WHERE g.student_id = ?
    ORDER BY c.semester, c.code`).all(req.params.id)
  res.json(rows)
})

// Courses taught by a lecturer
api.get('/lecturers/:id/courses', (req, res) => {
  const rows = db.prepare(`
    SELECT c.code, c.title, c.semester,
           (SELECT COUNT(*) FROM grades g WHERE g.course_code = c.code) AS studentCount
    FROM courses c
    WHERE c.lecturer_id = ?
    ORDER BY c.code`).all(req.params.id)
  res.json(rows)
})

// One course with its roster and grades
api.get('/courses/:code', (req, res) => {
  const course = db.prepare('SELECT code, title, semester, lecturer_id AS lecturerId FROM courses WHERE code = ?').get(req.params.code)
  if (!course) return res.status(404).json({ error: 'Course not found' })
  const students = db.prepare(`
    SELECT u.id AS studentId, u.name, g.coursework, g.exam
    FROM grades g JOIN users u ON u.id = g.student_id
    WHERE g.course_code = ?
    ORDER BY u.id`).all(req.params.code)
  res.json({ ...course, students })
})

export default api
