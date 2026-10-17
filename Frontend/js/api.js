const API_BASE = 'http://localhost:4000/api'

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',            // send the httpOnly session cookie
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

const get = path => request('GET', path)
const post = (path, body) => request('POST', path, body ?? {})

// Data
export const fetchStudentGrades = id => get(`/students/${encodeURIComponent(id)}/grades`)
export const fetchLecturerCourses = id => get(`/lecturers/${encodeURIComponent(id)}/courses`)
export const fetchCourse = code => get(`/courses/${encodeURIComponent(code)}`)

// Passkey enrolment and sign-in (server verifies everything)
export const registerOptions = (userId, code) => post('/register/options', { userId, code })
export const registerVerify = attestation => post('/register/verify', attestation)
export const loginOptions = () => post('/login/options')
export const loginVerify = assertion => post('/login/verify', assertion)

// Session
export const fetchMe = () => get('/me')
export const logout = () => post('/logout')
