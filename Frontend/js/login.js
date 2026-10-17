import { startRegistration, startAuthentication } from 'simple-webauthn-browser'
import { api } from './api.js'

const $ = id => document.getElementById(id)
let mode = 'signin'

// These calls happen before anyone is signed in, so a 401 must not bounce to the login page
const post = (path, body) => api(path, { method: 'POST', body: body ?? {}, redirectOn401: false })

function render() {
  const reg = mode === 'register'
  $('title').textContent = reg ? 'Create your passkey' : 'Sign in with passkey'
  $('subtitle').textContent = reg
    ? 'Enter your university ID and the one-time code from your administrator.'
    : 'Use your fingerprint, face or security key. No password to remember.'
  $('register-fields').hidden = !reg
  $('submit').textContent = reg ? 'Create passkey' : 'Sign in with passkey'
  $('divider-text').textContent = reg ? 'already registered?' : 'first time here?'
  $('toggle').textContent = reg ? 'Back to sign in' : 'Register a new passkey'
  $('status').hidden = true
  $('error').hidden = true
}

function setStatus(text) {
  $('status').textContent = text
  $('status').hidden = !text
  if (text) $('error').hidden = true
}

function setError(err) {
  // NotAllowedError means the user cancelled the passkey prompt
  if (err.name === 'NotAllowedError') {
    $('error').textContent = 'The passkey prompt was cancelled. Please try again.'
  } else {
    $('error').textContent = err.message
  }
  $('error').hidden = false
  $('status').hidden = true
}

function goToHomePage(user) {
  location.href = user.role === 'student' ? 'student.html' : 'lecturer.html'
}

$('toggle').addEventListener('click', () => {
  mode = mode === 'register' ? 'signin' : 'register'
  render()
})

// Enrolment: server checks the one-time code, we create a passkey, server verifies and stores the PUBLIC key.
async function enrol() {
  const userId = $('user-id').value.trim()
  const code = $('code').value.trim()
  if (!userId || !code) throw new Error('Enter your university ID and enrolment code.')

  setStatus('Checking your enrolment code…')
  const optionsJSON = await post('/api/register/options', { userId, code })
  const who = optionsJSON.account
  setStatus(`Creating a passkey for ${who.name} (${who.role}). Follow your device prompt…`)
  const attestation = await startRegistration({ optionsJSON })
  setStatus('Verifying with the server…')
  const { user } = await post('/api/register/verify', attestation)

  // Registration also signs the user in, so go straight to their page
  $('code').value = ''
  goToHomePage(user)
}

// Sign-in: server issues a fresh challenge, the passkey signs it, the server verifies and starts the session.
async function signIn() {
  setStatus('Requesting a challenge…')
  const optionsJSON = await post('/api/login/options')
  setStatus('Follow your device prompt to verify it’s you…')
  const assertion = await startAuthentication({ optionsJSON })
  setStatus('Verifying with the server…')
  const { user } = await post('/api/login/verify', assertion)
  goToHomePage(user)
}

$('form').addEventListener('submit', async e => {
  e.preventDefault()
  $('submit').disabled = true
  $('error').hidden = true
  try {
    await (mode === 'register' ? enrol() : signIn())
  } catch (err) {
    setError(err)
  } finally {
    $('submit').disabled = false
  }
})

render()
