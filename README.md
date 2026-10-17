# University Grade Portal

Students view their own grades. Lecturers manage grades for their assigned courses.
Sign-in is meant to use WebAuthn passkeys (no password).

> Status: the frontend is a UI preview with dummy data. Passkey login and the
> API connection are not wired up yet.

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
| `npm run db:seed` | Fill the database with dummy users, courses and grades |
| `npm run db:demo` | Run example queries against the database |

Reset the database: delete `Backend/portal.db`, then run `npm run db:seed`.

## Where to connect things later

- `Frontend/js/data.js`: dummy data and fake session. Replace with `fetch()` calls to the API.
- `Frontend/js/login.js`: replace the fake delay with passkey sign-in
  (`startRegistration` / `startAuthentication` from `@simplewebauthn/browser`).
- `Frontend/js/course.js`: the Save button needs to send grades to the API.
- Role checks in the frontend are for show only. Enforce them in the Express routes.
