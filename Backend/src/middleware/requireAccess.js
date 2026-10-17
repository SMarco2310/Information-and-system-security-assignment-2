// ownership / course assignment
import db from '../db.js'
import { deny } from '../lib/deny.js'

// Student  -> only their own record (ownership check).
// Lecturer -> only a student enrolled in a course assigned to that lecturer, and the
//             route then returns only the rows for the lecturer's own courses.

const taughtStudent = db.prepare(`
  SELECT 1 FROM grades g JOIN courses c ON c.code = g.course_code
  WHERE g.student_id = ? AND c.lecturer_id = ? LIMIT 1`)

export function requireStudentRecordAccess(req, res, next) {
  const { id, role } = req.user
  if (role === 'student') {
    if (req.params.id !== id) return deny(res)
    req.lecturerFilter = null
    return next()
  }
  if (role === 'lecturer') {
    if (!taughtStudent.get(req.params.id, id)) return deny(res)
    req.lecturerFilter = id
    return next()
  }
  return deny(res)
}

// Lecturer may act only on a course assigned to them (courses.lecturer_id).
const assignedCourse = db.prepare(
  'SELECT code, title, semester FROM courses WHERE code = ? AND lecturer_id = ?')

export function requireCourseAssignment(req, res, next) {
  const course = assignedCourse.get(req.params.code, req.user.id)
  if (!course) return deny(res)
  req.course = course
  next()
}
