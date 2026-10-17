import Database from 'better-sqlite3'

const db = new Database(process.env.DB_PATH || 'portal.db')
// db.pragma('journal_mode = WAL')
// db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'lecturer'))
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    public_key BLOB NOT NULL,
    counter    INTEGER NOT NULL DEFAULT 0,
    transports TEXT
  );

  -- WebAuthn challenges: random, short-lived and deleted when used (never reusable)
  CREATE TABLE IF NOT EXISTS challenges (
    challenge  TEXT PRIMARY KEY,
    type       TEXT NOT NULL CHECK (type IN ('register', 'login')),
    user_id    TEXT,
    expires_at INTEGER NOT NULL
  );

  -- Server-side sessions. Only a hash of the cookie token is stored.
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  );

  -- One-time enrolment codes created by the trusted setup script (seed.js).
  -- Only a SHA-256 hash is stored; the code itself is printed once.
  CREATE TABLE IF NOT EXISTS enrolment_codes (
    user_id    TEXT PRIMARY KEY REFERENCES users(id),
    code_hash  TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used_at    INTEGER
  );

  CREATE TABLE IF NOT EXISTS courses (
    code        TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    semester    TEXT NOT NULL,
    credits     INTEGER NOT NULL DEFAULT 3,
    lecturer_id TEXT NOT NULL REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS grades (
    student_id  TEXT NOT NULL REFERENCES users(id),
    course_code TEXT NOT NULL REFERENCES courses(code),
    coursework  INTEGER CHECK (coursework BETWEEN 0 AND 100),
    exam        INTEGER CHECK (exam BETWEEN 0 AND 100),
    PRIMARY KEY (student_id, course_code)
  );
`)

export default db
