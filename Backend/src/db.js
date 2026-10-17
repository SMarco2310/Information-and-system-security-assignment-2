import Database from 'better-sqlite3'

// Opens (or creates) the database file
const db = new Database(process.env.DB_PATH || 'portal.db')
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')   // make REFERENCES rules actually enforced

// Create the tables if they do not exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'lecturer'))
  );

  -- One row per registered passkey. We only keep the PUBLIC key.
  CREATE TABLE IF NOT EXISTS credentials (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id),
    public_key BLOB NOT NULL,
    counter    INTEGER NOT NULL DEFAULT 0,
    transports TEXT
  );

  -- One-time codes that let a user register their first passkey.
  -- We store a hash of the code, never the code itself.
  CREATE TABLE IF NOT EXISTS enrolment_codes (
    user_id    TEXT PRIMARY KEY REFERENCES users(id),
    code_hash  TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0
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
