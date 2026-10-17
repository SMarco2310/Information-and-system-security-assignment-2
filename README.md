# University Grade Portal

Students view their own grades. Lecturers manage grades for their assigned courses.
Sign-in is meant to use WebAuthn passkeys (no password).

> Status: real WebAuthn passkey enrolment, sign-in, server sessions and
> server-side role/ownership checks work. Automated tests cover T2–T6
> (`npm test` in `Backend/`); the AES-GCM demo is `npm run demo:aes`.

## Structure

```
Backend/    Express API + SQLite database
Frontend/   Plain HTML, CSS and JavaScript (no build step)
```

## Requirements

- Node.js 18 or newer
- Python 3 (only used to serve the frontend files; any static server works)

## Start the app

**Quickest way: one command**

```bash
python3 run.py
```

It installs backend dependencies and seeds the database if needed, starts the
backend (http://localhost:4000) and the frontend (http://localhost:3000), and
opens the login page. Press Ctrl+C to stop both. Use `python3 run.py --no-browser`
to skip opening the browser.

**Or start each part by hand** in two terminals:

**1. Backend** (http://localhost:4000)

```bash
cd Backend
npm install
npm run db:seed    # creates portal.db with dummy data (first time only)
npm run dev        # auto-restarts on changes; use `npm start` for a plain run
```

Check it works: http://localhost:4000/api/health should return `{"status":"ok"}`.

**2. Frontend** (http://localhost:3000)

```bash
cd Frontend
python3 -m http.server 3000
```

Open http://localhost:3000/login.html. Pick **Student** or **Lecturer** under
"Demo only: preview as", then press the sign-in button.

Keep the frontend on port 3000. The backend only allows that origin (CORS).

## Register a passkey and sign in

1. `cd Backend && npm run db:seed` and note the one-time code printed for a user.
2. Open http://localhost:3000/login.html, press **Register a new passkey**, enter the
   user's ID (e.g. `S1042`) and the code, then follow your device's passkey prompt.
3. Registering also signs you in. Next time, press **Sign in with passkey**. No username
   is typed: the passkey identifies the user, and the server verifies it before starting a session.

Needs a browser with passkey support and a platform authenticator or FIDO2 security key.
Passkeys are bound to the device and to `localhost`; an examiner registers their own by
running the seed script on their machine and repeating step 2 with their own codes.
Re-running the seed script wipes the tables (including registered passkeys) and starts over.

## Test accounts (fictional)

Created by `npm run db:seed` (a trusted setup script, not a self-service signup):

| Brief label | ID | Name | Role |
| --- | --- | --- | --- |
| S1 | `S1042` | Amina Yusuf | student |
| S2 | `S1043` | Ben Carter | student |
| L1 | `L201` | Dr. Daniel Okafor | lecturer |

One mock course, **CS310 Information Security**, is taught by `L201`; both students are enrolled.

Seeding also issues a **one-time enrolment code** per user (valid 24h). Codes are printed
once in the terminal and stored only as a SHA-256 hash. Re-run `npm run db:seed` to get new
ones (this resets the database). This is a demonstration bootstrap: in production the university would verify identity
before issuing an enrolment credential, and would not print codes to a console. Never commit codes.

## Configuration

`Backend/.env`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Frontend origin allowed by CORS |
| `DB_PATH` | `portal.db` | SQLite file location |

## Useful commands (Backend)

| Command | What it does |
| --- | --- |
| `npm run dev` | Start API with auto-restart |
| `npm start` | Start API |
| `npm run db:seed` | Reset the database with fake users, courses, grades and one-time enrolment codes |
| `npm test` | Run the automated RBAC tests (T2–T6) on a throwaway database |
| `npm run db:demo` | Run example queries against the database |

Reset the database: delete `Backend/portal.db`, then run `npm run db:seed`.

## Where to connect things later

- `Frontend/js/data.js`: dummy data and fake session. Replace with `fetch()` calls to the API.
- `Frontend/js/login.js`: replace the fake delay with passkey sign-in
  (`startRegistration` / `startAuthentication` from `@simplewebauthn/browser`).
- `Frontend/js/course.js`: the Save button needs to send grades to the API.
- Role checks in the frontend are for show only. Enforce them in the Express routes.
