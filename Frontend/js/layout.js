import { api } from './api.js'

export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export function badge(letter) {
  const tone = letter === 'A' || letter === 'B' ? 'good' : letter === 'F' ? 'bad' : 'mid'
  return `<span class="badge ${tone}">${letter}</span>`
}

export const statCard = (label, value, hint = '') =>
  `<div class="stat"><span class="label">${esc(label)}</span><strong class="value">${esc(value)}</strong>${hint ? `<span class="hint">${esc(hint)}</span>` : ''}</div>`

const homeFor = role => (role === 'student' ? 'student.html' : 'lecturer.html')

/** Asks the SERVER who is signed in, draws the top bar, and returns the user (or null).
 * the API enforces the real rules. */
export async function renderTopbar(expectedRole) {
  let session
  try {
    session = await api('/api/me')
  } catch (e) {
    if (e.status !== 401) document.querySelector('.content').innerHTML = `<p class="banner warn">${esc(e.message)}</p>`
    return null
  }
  if (expectedRole && session.role !== expectedRole) {
    location.replace(homeFor(session.role))
    return null
  }
  const home = homeFor(session.role)
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
  document.getElementById('signout').addEventListener('click', async () => {
    try { await api('/api/logout', { method: 'POST' }) } catch { /* go to login regardless */ }
    location.href = 'login.html'
  })
  return session
}
