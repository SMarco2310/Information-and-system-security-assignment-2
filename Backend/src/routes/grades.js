import { Router } from 'express'
import db from '../db.js'
import { requireSession } from '../middleware/requireSession.js'
import { requireRole } from '../middleware/requireRole.js'
import { requireStudentRecordAccess } from '../middleware/requireAccess.js'

const router = Router()

// Own profile (any signed-in user)
router.get('/me', requireSession, (req, res) => res.json(req.user))

// Grade view: session -> role -> ownership / course assignment
router.get('/students/:id/grades',
  requireSession,
  requireRole('student', 'lecturer'),
  requireStudentRecordAccess,
  (req, res) => {
    const grades = db.prepare(`
      SELECT c.code, c.title, c.semester, c.credits, u.name AS lecturer, g.coursework, g.exam
      FROM grades g
      JOIN courses c ON c.code = g.course_code
      JOIN users u ON u.id = c.lecturer_id
      WHERE g.student_id = ? AND (? IS NULL OR c.lecturer_id = ?)
      ORDER BY c.semester, c.code`)
      .all(req.params.id, req.lecturerFilter, req.lecturerFilter)
    res.json({ studentId: req.params.id, grades })
  })

export default router
