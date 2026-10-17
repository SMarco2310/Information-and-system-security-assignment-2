import { api } from './api.js'

const $ = id => document.getElementById(id)
let mode = 'signin'

function render() {
  const reg = mode === 'register'
  $('title').textContent = reg ? 'Create your passkey' : 'Sign in with passkey'
  $('subtitle').textContent = reg
    ? 'Link a passkey to your university account. First-time setup only.'
    : 'Use your fingerprint, face or security key. No password to remember.'
  $('name-field').hidden = !reg
  $('submit').textContent = reg ? 'Create passkey' : 'Sign in with passkey'
  $('divider-text').textContent = reg ? 'already registered?' : 'first time here?'
  $('toggle').textContent = reg ? 'Back to sign in' : 'Register a new passkey'
}

$('toggle').addEventListener('click', () => {
  mode = mode === 'register' ? 'signin' : 'register'
  render()
})

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


  await api('/api/dev/login', { method: 'POST', body: { userId: role === 'student' ? 'S1042' : 'L201' } })
  location.href = role === 'student' ? 'student.html' : 'lecturer.html'
})

render()
