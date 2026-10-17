import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import auth from './auth.js'
import api from './api.js'

const app = express()
const port = process.env.PORT || 4000

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', auth)   // passkey registration, login, logout, /me
app.use('/api', api)    // data routes (still unprotected, see api.js)

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
