import { fetchLecturerCourses } from './api.js'
import { renderTopbar, esc, showError } from './layout.js'

const session = await renderTopbar('lecturer')
if (session) {
  let courses = []
  try {
    courses = await fetchLecturerCourses(session.id)
  } catch (err) {
    showError(err)
  }
  document.getElementById('courses').innerHTML = courses.map(c => `
    <a class="course" href="course.html?code=${encodeURIComponent(c.code)}">
      <span class="code">${esc(c.code)}</span>
      <h2>${esc(c.title)}</h2>
      <p>${esc(c.semester)}</p>
      <div class="meta"><span>${c.studentCount} students</span><span class="open">Manage grades →</span></div>
    </a>`).join('')
}
