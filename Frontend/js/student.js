import { totalScore, letterFor, pointsFor } from './data.js'
import { fetchStudentGrades } from './api.js'
import { renderTopbar, badge, statCard, esc, showError } from './layout.js'

const session = await renderTopbar('student')
if (session) {
  let results = []
  try {
    results = await fetchStudentGrades(session.id)
  } catch (err) {
    showError(err)
  }
  const rows = results.map(r => {
    const total = totalScore(r.coursework, r.exam)
    const letter = letterFor(total)
    return { ...r, total, letter, points: pointsFor(letter) }
  })

  const credits = rows.reduce((s, r) => s + r.credits, 0)
  const gpa = credits ? (rows.reduce((s, r) => s + r.points * r.credits, 0) / credits).toFixed(2) : '–'
  const average = rows.length ? Math.round(rows.reduce((s, r) => s + r.total, 0) / rows.length) : 0

  document.getElementById('stats').innerHTML =
    statCard('Cumulative GPA', gpa, 'out of 4.00') +
    statCard('Average score', `${average}%`) +
    statCard('Credits', credits, 'this academic year')

  const select = document.getElementById('semester')
  const semesters = [...new Set(rows.map(r => r.semester))]
  select.innerHTML = '<option value="all">All semesters</option>' +
    semesters.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')

  const draw = () => {
    const visible = select.value === 'all' ? rows : rows.filter(r => r.semester === select.value)
    document.getElementById('rows').innerHTML = visible.map(r => `
      <tr>
        <td><strong>${esc(r.code)}</strong><div class="sub">${esc(r.title)} · ${esc(r.lecturer)}</div></td>
        <td>${esc(r.semester)}</td>
        <td class="num">${r.credits}</td>
        <td class="num">${r.coursework}</td>
        <td class="num">${r.exam}</td>
        <td class="num"><strong>${r.total}</strong></td>
        <td>${badge(r.letter)}</td>
      </tr>`).join('')
  }
  select.addEventListener('change', draw)
  draw()
}
