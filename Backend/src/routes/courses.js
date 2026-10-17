import { Router } from 'express'
import db from '../db.js'
import { requireSession } from '../middleware/requireSession.js'
import { requireRole } from '../middleware/requireRole.js'
import { requireCourseAssignment } from '../middleware/requireAccess.js'

const router = Router()
const lecturerOnly = [requireSession, requireRole('lecturer')]

// Courses assigned to the signed-in lecturer
router.get('/courses', ...lecturerOnly, (req, res) => {
  const courses = db.prepare(`
    SELECT c.code, c.title, c.semester,
           (SELECT COUNT(*) FROM grades g WHERE g.course_code = c.code) AS students
    FROM courses c WHERE c.lecturer_id = ? ORDER BY c.code`).all(req.user.id)
  res.json({ courses })
})

// Roster: only for an assigned course
router.get('/courses/:code/roster', ...lecturerOnly, requireCourseAssignment, (req, res) => {
  const students = db.prepare(`
    SELECT u.id AS studentId, u.name, g.coursework, g.exam
    FROM grades g JOIN users u ON u.id = g.student_id
    WHERE g.course_code = ? ORDER BY u.id`).all(req.course.code)
  res.json({ course: req.course, students })
})

const validScore = v => Number.isInteger(v) && v >= 0 && v <= 100

// Grade edit: session -> role -> course assignment -> input validation.
// The UPDATE repeats the lecturer condition as defence in depth.
router.put('/courses/:code/grades/:studentId', ...lecturerOnly, requireCourseAssignment, (req, res) => {
  const { coursework, exam } = req.body ?? {}
  if (!validScore(coursework) || !validScore(exam)) {
    return res.status(400).json({ error: 'bad_request', message: 'coursework and exam must be whole numbers from 0 to 100.' })
  }
  const result = db.prepare(`
    UPDATE grades SET coursework = ?, exam = ?
    WHERE student_id = ? AND course_code = ?
      AND course_code IN (SELECT code FROM courses WHERE lecturer_id = ?)`)
    .run(coursework, exam, req.params.studentId, req.course.code, req.user.id)
  if (result.changes === 0) {
    return res.status(404).json({ error: 'not_found', message: 'That student is not enrolled in this course.' })
  }
  res.json({ studentId: req.params.studentId, courseCode: req.course.code, coursework, exam })
})

export default router
