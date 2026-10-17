import { lecturerCourses, totalScore, letterFor } from './data.js'
import { renderTopbar, badge, statCard, esc } from './layout.js'

if (renderTopbar('lecturer')) {
  const code = new URLSearchParams(location.search).get('code')
  const course = lecturerCourses.find(c => c.code === code)
  const $ = id => document.getElementById(id)

  if (!course) {
    document.querySelector('.content').innerHTML = '<h1>Course not found</h1><a href="lecturer.html">← Back to courses</a>'
  } else {
    const students = course.students.map(s => ({ ...s }))
    const original = JSON.stringify(students)
    let saved = false

    $('course-title').textContent = `${course.code} · ${course.title}`
    $('course-semester').textContent = course.semester

    const clamp = v => Math.min(100, Math.max(0, Math.round(Number(v)) || 0))
    const isDirty = () => JSON.stringify(students) !== original

    function drawSummary() {
      const totals = students.map(s => totalScore(s.coursework, s.exam))
      const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
      const pass = Math.round(100 * totals.filter(t => t >= 40).length / totals.length)
      $('stats').innerHTML =
        statCard('Students', students.length) +
        statCard('Class average', `${avg}%`) +
        statCard('Pass rate', `${pass}%`, 'total ≥ 40')

      const banner = $('banner')
      banner.hidden = !(saved || isDirty())
      banner.className = 'banner ' + (saved ? 'ok' : 'warn')
      banner.textContent = saved ? 'Grades saved (demo only — nothing sent).' : 'You have unsaved changes.'
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
      saved = false
      drawSummary()
    })
    $('rows').addEventListener('change', e => {
      const input = e.target.closest('input[data-field]')
      if (input) input.value = students.find(x => x.studentId === input.closest('tr').dataset.id)[input.dataset.field]
    })

    $('search').addEventListener('input', drawRows)
    $('save').addEventListener('click', () => {
      // TODO: send `students` to your Express API here
      saved = true
      drawSummary()
    })

    drawRows()
    drawSummary()
  }
}
