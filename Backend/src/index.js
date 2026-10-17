import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
const port = process.env.PORT || 4000

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }))
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
