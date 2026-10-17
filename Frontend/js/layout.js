import { getSession, clearSession } from './data.js'

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function badge(letter) {
  const tone = letter === 'A' || letter === 'B' ? 'good' : letter === 'F' ? 'bad' : 'mid'
  return `<span class="badge ${tone}">${letter}</span>`
}

export const statCard = (label, value, hint = '') =>
  `<div class="stat"><span class="label">${esc(label)}</span><strong class="value">${esc(value)}</strong>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`

/** Renders the top bar into #topbar and returns the session. Redirects to login if none (demo only, NOT real security). */
export function renderTopbar(expectedRole) {
  const session = getSession()
  if (!session || (expectedRole && session.role !== expectedRole)) {
    location.replace('login.html')
    return null
  }
  const home = session.role === 'student' ? 'student.html' : 'lecturer.html'
  const label = session.role === 'student' ? 'My Grades' : 'My Courses'
  document.getElementById('topbar').innerHTML = `
    <div class="inner">
      <a class="brand" href="${home}"><span class="mark" aria-hidden="true">U</span>University Grade Portal</a>
      <nav><a class="active" href="${home}">${label}</a></nav>
      <div class="user">
        <div class="who"><strong>${esc(session.name)}</strong><span>${session.role === 'student' ? 'Student' : 'Lecturer'} · ${esc(session.id)}</span></div>
        <button class="btn secondary" id="signout" type="button">Sign out</button>
      </div>
    </div>`
  document.getElementById('signout').addEventListener('click', () => {
    clearSession()
    location.href = 'login.html'
  })
  return session
}
