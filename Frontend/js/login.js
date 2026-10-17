import { startRegistration, startAuthentication } from 'simple-webauthn-browser'
import { registerOptions, registerVerify, loginOptions, loginVerify } from './api.js'

const $ = id => document.getElementById(id)
let mode = 'signin'

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
  // NotAllowedError = the user cancelled or the device prompt timed out
  const text = err?.name === 'NotAllowedError'
    ? 'The passkey prompt was cancelled or timed out. Please try again.'
    : err?.name === 'InvalidStateError'
      ? 'A passkey for this account already exists on this device.'
      : (err?.message || 'Something went wrong. Please try again.')
  $('error').textContent = text
  $('error').hidden = false
  $('status').hidden = true
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
  const optionsJSON = await registerOptions(userId, code)
  setStatus('Follow your device prompt to create a passkey…')
  const attestation = await startRegistration({ optionsJSON })
  setStatus('Verifying with the server…')
  await registerVerify(attestation)

  $('code').value = ''
  mode = 'signin'
  render()
  setStatus('Passkey registered. You can now sign in.')
}

// Sign-in: server issues a fresh challenge, the passkey signs it, the server verifies and starts the session.
async function signIn() {
  setStatus('Requesting a challenge…')
  const optionsJSON = await loginOptions()
  setStatus('Follow your device prompt to verify it’s you…')
  const assertion = await startAuthentication({ optionsJSON })
  setStatus('Verifying with the server…')
  const { user } = await loginVerify(assertion)
  location.href = user.role === 'student' ? 'student.html' : 'lecturer.html'
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
