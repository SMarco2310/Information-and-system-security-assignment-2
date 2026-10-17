import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const NOTE = 'Student consultation note – demonstration data only'

const key = randomBytes(32)
// It must be unique for every encryption under the same key.
const iv = randomBytes(12)

function encrypt(plaintext, key, iv) {
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag() // 16-byte authentication tag
  return { ciphertext, tag }
}

function decrypt(ciphertext, tag, key, iv) {
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

const line = '-'.repeat(60)
let allPassed = true

console.log(line)
console.log('AES-256-GCM demo')
console.log(line)
console.log('Plaintext      :', NOTE)
console.log('Key length     :', key.length * 8, 'bits (not printed on purpose)')
console.log('IV (hex)       :', iv.toString('hex'))

const { ciphertext, tag } = encrypt(NOTE, key, iv)
console.log('Ciphertext(hex):', ciphertext.toString('hex'))
console.log('Auth tag (hex) :', tag.toString('hex'))

console.log('\n[A] Decrypt UNCHANGED ciphertext')
try {
  const recovered = decrypt(ciphertext, tag, key, iv)
  const ok = recovered === NOTE
  console.log('    Recovered :', recovered)
  console.log('    Result    :', ok ? 'PASS - plaintext recovered' : 'FAIL - text differs')
  allPassed &&= ok
} catch (err) {
  console.log('    Result    : FAIL - unexpected error:', err.message)
  allPassed = false
}

console.log('\n[B] Decrypt TAMPERED ciphertext (one byte changed)')
const tampered = Buffer.from(ciphertext)
tampered[0] ^= 0x01
console.log('    Original byte 0 :', ciphertext[0].toString(16).padStart(2, '0'))
console.log('    Tampered byte 0 :', tampered[0].toString(16).padStart(2, '0'))
try {
  const leaked = decrypt(tampered, tag, key, iv)
  console.log('    Result    : FAIL - tampering was NOT detected:', leaked)
  allPassed = false
} catch (err) {
  console.log('    Error     :', err.message)
  console.log('    Result    : PASS - tampered ciphertext rejected, no plaintext returned')
}

console.log('\n' + line)
console.log(allPassed ? 'T8 OVERALL: PASS' : 'T8 OVERALL: FAIL')
console.log(line)
process.exit(allPassed ? 0 : 1)