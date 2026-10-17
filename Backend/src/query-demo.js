import db from './db.js'

// 1) One row
console.log(db.prepare('SELECT * FROM users WHERE id = ?').get('S1042'))

// 2) Many rows: a student sees only THEIR OWN grades
console.log(db.prepare(`
  SELECT c.code, c.title, g.coursework, g.exam
  FROM grades g JOIN courses c ON c.code = g.course_code
  WHERE g.student_id = ?`).all('S1042'))

// 3) Update: only if this lecturer owns the course
const res = db.prepare(`
  UPDATE grades SET exam = ?
  WHERE student_id = ? AND course_code = ?
    AND course_code IN (SELECT code FROM courses WHERE lecturer_id = ?)`)
  .run(88, 'S1043', 'CS310', 'L201')
console.log('rows changed:', res.changes)   // 0 means "not your course" or no such row
