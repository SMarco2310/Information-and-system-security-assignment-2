// Dummy data + helpers. Replace with fetch() calls to your Express API.

export const COURSEWORK_WEIGHT = 0.4
export const EXAM_WEIGHT = 0.6

export const totalScore = (coursework, exam) =>
  Math.round(coursework * COURSEWORK_WEIGHT + exam * EXAM_WEIGHT)

export function letterFor(score) {
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export const pointsFor = letter => ({ A: 4, B: 3, C: 2, D: 1, F: 0 })[letter]

export const users = {
  student: { role: 'student', name: 'Amina Yusuf', id: 'S1042' },
  lecturer: { role: 'lecturer', name: 'Dr. Daniel Okafor', id: 'L201' }
}

export const studentResults = [
  { code: 'CS101', title: 'Introduction to Programming', credits: 4, semester: '2025 / Sem 1', lecturer: 'Dr. M. Hassan', coursework: 78, exam: 71 },
  { code: 'MA201', title: 'Discrete Mathematics', credits: 3, semester: '2025 / Sem 1', lecturer: 'Prof. L. Tan', coursework: 64, exam: 58 },
  { code: 'CS240', title: 'Data Structures', credits: 4, semester: '2025 / Sem 2', lecturer: 'Dr. D. Okafor', coursework: 81, exam: 76 },
  { code: 'CS310', title: 'Information Security', credits: 4, semester: '2025 / Sem 2', lecturer: 'Dr. D. Okafor', coursework: 69, exam: 52 },
  { code: 'EN150', title: 'Academic Writing', credits: 2, semester: '2025 / Sem 2', lecturer: 'Ms. R. Silva', coursework: 45, exam: 38 }
]

const names = ['Amina Yusuf', 'Ben Carter', 'Chloe Nguyen', 'Dev Patel', 'Elena Rossi', 'Farid Haddad', 'Grace Lim', 'Hiro Tanaka', 'Isla Murphy', 'Jonas Weber']

const roster = seed => names.map((name, i) => ({
  studentId: `S${1042 + i}`,
  name,
  coursework: 40 + ((i * 7 + seed) % 55),
  exam: 30 + ((i * 11 + seed * 3) % 65)
}))

export const lecturerCourses = [
  { code: 'CS310', title: 'Information Security', semester: '2025 / Sem 2', students: roster(3) },
  { code: 'CS240', title: 'Data Structures', semester: '2025 / Sem 2', students: roster(8) }
]

// Dummy session (sessionStorage). Replace with your real WebAuthn-backed session.
export function getSession() {
  try { return JSON.parse(sessionStorage.getItem('session')) } catch { return null }
}
export function setSession(role) {
  sessionStorage.setItem('session', JSON.stringify(users[role]))
}
export function clearSession() {
  sessionStorage.removeItem('session')
}
