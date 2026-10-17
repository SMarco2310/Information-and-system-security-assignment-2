import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import gradesRouter from './routes/grades.js'
import coursesRouter from './routes/courses.js'
import authRouter from './auth.js'

export const app = express()

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }))
app.use(express.json())

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api', authRouter)   // passkey register / login / logout
app.use('/api', gradesRouter)
app.use('/api', coursesRouter)
app.use('/api', (_req, res) => res.status(404).json({ error: 'not_found', message: 'No such endpoint.' }))

app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_request', message: 'Invalid JSON.' })
  console.error(err)
  res.status(500).json({ error: 'server_error', message: 'Something went wrong.' })
})
