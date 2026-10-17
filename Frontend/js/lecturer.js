import { renderTopbar, esc } from './layout.js'
import { api } from './api.js'

const session = await renderTopbar('lecturer')

if (session) {
  const box = document.getElementById('courses')
  try {
    const { courses } = await api('/api/courses')
    box.innerHTML = courses.length ? courses.map(c => `
      <a class="course" href="course.html?code=${encodeURIComponent(c.code)}">
        <span class="code">${esc(c.code)}</span>
        <h2>${esc(c.title)}</h2>
        <p>${esc(c.semester)}</p>
        <div class="meta"><span>${c.students} students</span><span class="open">Manage grades →</span></div>
      </a>`).join('') : '<p>No courses are assigned to you.</p>'
  } catch (e) {
    box.innerHTML = `<p class="banner warn">${esc(e.message)}</p>`
  }
}
