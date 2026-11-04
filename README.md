# Academia – Student Dashboard
React + Vite + Tailwind CSS v4 + Lucide icons. Installable as an app (PWA). Needs Node 18+.

## Folder layout
academia/
  package.json
  server.js
  vite.config.js
  index.html
  README.md
  src/        main.jsx  App.jsx  index.css
  public/     manifest.webmanifest  sw.js  icon-192.png  icon-512.png

## Turso setup
1. Create a Turso database and generate a new auth token.
2. Copy `.env.example` to `.env`.
3. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env`.
   These are server-only secrets: do not prefix them with `VITE_` or expose them in browser code.
4. If you shared an auth token publicly, revoke it and use a replacement.

The server creates the account, session, and student-data tables on startup. Passwords are stored as salted scrypt hashes; the browser receives only an HttpOnly session cookie. Timetable slots, quizzes/exams, courses, and grades are stored in the user's Turso record.

## Run (development)
npm install
npm run dev          # Vite at http://localhost:5173 and API at http://localhost:3000

## Run in production
npm run build
npm start            # serves the built app and API on port 3000

Deploy the Node server (not just the static `dist/` folder) to a Node-compatible host. Configure the two Turso environment variables in the host's server environment.

## Notes
- App data and accounts are saved in Turso. The browser only keeps the server-managed session cookie.
- Existing local browser data is imported into Turso when signing up from a browser that has the previous version's data.
- Grade scale lives in the SCALE array at the top of src/App.jsx.
