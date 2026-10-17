import { setSession } from './data.js'

const $ = id => document.getElementById(id)
let mode = 'signin'

function render() {
  const reg = mode === 'register'
  $('title').textContent = reg ? 'Register a passkey' : 'Sign in'
  $('subtitle').textContent = reg
    ? 'Link a passkey to your university account. First-time setup only.'
    : 'Use your passkey — no password needed.'
  $('name-field').hidden = !reg
  $('id-label').textContent = reg ? 'University email or ID' : 'University email or ID (optional)'
  $('submit').textContent = reg ? 'Create passkey' : 'Sign in with passkey'
  $('footer').innerHTML = reg
    ? 'Already registered? <a href="#" id="toggle">Sign in</a>'
    : 'First time here? <a href="#" id="toggle">Register a passkey</a>'
  $('toggle').addEventListener('click', e => {
    e.preventDefault()
    mode = reg ? 'signin' : 'register'
    render()
  })
}

$('form').addEventListener('submit', async e => {
  e.preventDefault()
  const role = document.querySelector('input[name=role]:checked').value
  $('submit').disabled = true
  $('status').hidden = false
  $('status').textContent = mode === 'register'
    ? 'Follow your device prompt to create a passkey…'
    : 'Follow your device prompt to verify it’s you…'

  // TODO: replace this fake delay with SimpleWebAuthn:
  //   startRegistration / startAuthentication from @simplewebauthn/browser
  await new Promise(r => setTimeout(r, 900))

  setSession(role)
  location.href = role === 'student' ? 'student.html' : 'lecturer.html'
})

render()
