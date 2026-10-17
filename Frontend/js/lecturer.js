import { lecturerCourses } from './data.js'
import { renderTopbar, esc } from './layout.js'

if (renderTopbar('lecturer')) {
  document.getElementById('courses').innerHTML = lecturerCourses.map(c => `
    <a class="course" href="course.html?code=${encodeURIComponent(c.code)}">
      <span class="code">${esc(c.code)}</span>
      <h2>${esc(c.title)}</h2>
      <p>${esc(c.semester)}</p>
      <div class="meta"><span>${c.students.length} students</span><span class="open">Manage grades →</span></div>
    </a>`).join('')
}
