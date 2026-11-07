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

## Existing users and data
The app supports separate personal accounts: each person signs up with a unique Student ID or email, and their data is scoped to that account. Existing accounts and records remain in the configured Turso database; startup uses `CREATE TABLE IF NOT EXISTS` and does not reset or replace those tables.

When deploying an update, configure the same `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` that point to the database currently holding users' data. Do not create a new database or run a reset/import over existing tables. Users should sign in with the same Student ID or email they used before. Legacy data that exists only in a browser is imported when a new account is created; if it cannot be read or validated, signup stops and leaves that browser data untouched.

## Run (development)
npm install
npm run dev          # Vite at http://localhost:5173 and API at http://localhost:3000

## Run in production
npm run build
npm start            # serves the built app and API on port 3000

Deploy the Node server (not just the static `dist/` folder) to a Node-compatible host. Configure the two Turso environment variables in the host's server environment.

## Deploy to Vercel
1. Import the repository into Vercel and set the project root to the folder containing `package.json`.
2. Keep the Vite framework preset, build command `npm run build`, and output directory `dist` (also defined in `vercel.json`).
3. In **Project Settings → Environment Variables**, add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` for each environment you deploy (Production, and Preview if needed). These must not have a `VITE_` prefix.
4. Redeploy after adding or changing environment variables.

The `api/` directory contains Vercel serverless functions for account and data APIs. Vercel deployment does not run `server.js`; that file is only the local/Node-server entry point. `.env` is local-only and is not uploaded from this project, so configure the variables in Vercel itself.

## Notes
- App data and accounts are saved in Turso. The browser only keeps the server-managed session cookie.
- Existing local browser data is imported into Turso when signing up from a browser that has the previous version's data.
- Grade scale lives in the SCALE array at the top of src/App.jsx.
