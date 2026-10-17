import { totalScore, letterFor } from './data.js'
import { renderTopbar, badge, statCard, esc } from './layout.js'
import { api } from './api.js'

const session = await renderTopbar('lecturer')
const $ = id => document.getElementById(id)

async function main() {
  const code = new URLSearchParams(location.search).get('code') || ''
  let data
  try {
    data = await api(`/api/courses/${encodeURIComponent(code)}/roster`)
  } catch (e) {
    const msg = e.status === 403 ? 'Access denied. This course is not assigned to you.' : e.message
    document.querySelector('.content').innerHTML =
      `<h1>Access denied</h1><p class="banner warn">${esc(msg)}</p><a href="lecturer.html">← Back to courses</a>`
    return
  }

  const { course } = data
  const students = data.students.map(s => ({ ...s }))
  const saved = new Map(students.map(s => [s.studentId, { coursework: s.coursework, exam: s.exam }]))
  let status = null // { cls, text } shown after a save attempt

  $('course-title').textContent = `${course.code} · ${course.title}`
  $('course-semester').textContent = course.semester

  const clamp = v => Math.min(100, Math.max(0, Math.round(Number(v)) || 0))
  const changed = s => s.coursework !== saved.get(s.studentId).coursework || s.exam !== saved.get(s.studentId).exam
  const isDirty = () => students.some(changed)

  function drawSummary() {
    const totals = students.map(s => totalScore(s.coursework, s.exam))
    const avg = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : 0
    const pass = totals.length ? Math.round(100 * totals.filter(t => t >= 40).length / totals.length) : 0
    $('stats').innerHTML =
      statCard('Students', students.length) +
      statCard('Class average', `${avg}%`) +
      statCard('Pass rate', `${pass}%`, 'total ≥ 40')

    const banner = $('banner')
    const shown = isDirty() ? { cls: 'warn', text: 'You have unsaved changes.' } : status
    banner.hidden = !shown
    if (shown) { banner.className = 'banner ' + shown.cls; banner.textContent = shown.text }
    $('save').className = 'btn' + (isDirty() ? '' : ' secondary')
  }

  function drawRows() {
    const q = $('search').value.toLowerCase()
    const list = students.filter(s => `${s.name} ${s.studentId}`.toLowerCase().includes(q))
    $('rows').innerHTML = list.length ? list.map(s => {
      const total = totalScore(s.coursework, s.exam)
      return `
        <tr data-id="${esc(s.studentId)}">
          <td><strong>${esc(s.name)}</strong><div class="sub">${esc(s.studentId)}</div></td>
          <td class="num"><input type="number" min="0" max="100" data-field="coursework" value="${s.coursework}" aria-label="Coursework for ${esc(s.name)}"></td>
          <td class="num"><input type="number" min="0" max="100" data-field="exam" value="${s.exam}" aria-label="Exam for ${esc(s.name)}"></td>
          <td class="num"><strong class="total">${total}</strong></td>
          <td class="grade">${badge(letterFor(total))}</td>
        </tr>`
    }).join('') : '<tr><td colspan="5" class="empty">No students match your search.</td></tr>'
  }

  // Update one row in place so inputs keep focus while typing
  $('rows').addEventListener('input', e => {
    const input = e.target.closest('input[data-field]')
    if (!input) return
    const tr = input.closest('tr')
    const s = students.find(x => x.studentId === tr.dataset.id)
    s[input.dataset.field] = clamp(input.value)
    const total = totalScore(s.coursework, s.exam)
    tr.querySelector('.total').textContent = total
    tr.querySelector('.grade').innerHTML = badge(letterFor(total))
    status = null
    drawSummary()
  })
  $('rows').addEventListener('change', e => {
    const input = e.target.closest('input[data-field]')
    if (input) input.value = students.find(x => x.studentId === input.closest('tr').dataset.id)[input.dataset.field]
  })

  $('search').addEventListener('input', drawRows)

  // Save: one PUT per changed student. The server re-checks session, role and course assignment.
  $('save').addEventListener('click', async () => {
    const todo = students.filter(changed)
    if (!todo.length) return
    $('save').disabled = true
    const results = await Promise.allSettled(todo.map(s =>
      api(`/api/courses/${encodeURIComponent(course.code)}/grades/${encodeURIComponent(s.studentId)}`,
        { method: 'PUT', body: { coursework: s.coursework, exam: s.exam } })))
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') saved.set(todo[i].studentId, { coursework: todo[i].coursework, exam: todo[i].exam })
    })
    const failed = results.find(r => r.status === 'rejected')
    status = failed
      ? { cls: 'warn', text: `Some grades were not saved: ${failed.reason.message}` }
      : { cls: 'ok', text: 'Grades saved.' }
    $('save').disabled = false
    drawSummary()
  })

  drawRows()
  drawSummary()
}

if (session) await main()
