import "dotenv/config";
import express from "express";
import { createClient } from "@libsql/client";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scrypt = promisify(scryptCallback);
const app = express();
const port = Number(process.env.PORT || 3000);
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;
const emptyData = { slots: [], tests: [], courses: [] };
const dataKeys = Object.keys(emptyData);
const root = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error(
    "Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in the server environment before starting the app."
  );
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getCookie(req, name) {
  const cookies = req.headers.cookie?.split(";") || [];
  const cookie = cookies.find((part) => part.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `academia_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDurationMs / 1000}${secure}`
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `academia_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
}

function validateData(data) {
  return (
    data &&
    typeof data === "object" &&
    dataKeys.every((key) => Array.isArray(data[key])) &&
    dataKeys.every((key) => data[key].length <= 500)
  );
}

async function createSession(userId, res) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  await db.execute({
    sql: "INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    args: [hashToken(token), userId, expiresAt],
  });
  setSessionCookie(res, token);
}

async function requireSession(req, res, next) {
  try {
    const token = getCookie(req, "academia_session");
    if (!token) return res.status(401).json({ error: "Please sign in." });

    const result = await db.execute({
      sql: `SELECT u.id, u.name, u.login_id
            FROM app_sessions s
            JOIN app_users u ON u.id = s.user_id
            WHERE s.token_hash = ? AND s.expires_at > ?`,
      args: [hashToken(token), new Date().toISOString()],
    });

    if (!result.rows.length) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    const row = result.rows[0];
    req.user = { id: row.id, name: row.name, idLabel: row.login_id };
    req.sessionHash = hashToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
}

async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(await passwordHash(password, salt).then((value) => value.split(":")[1]), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function initializeDatabase() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        login_id TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS app_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS student_data (
        user_id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
      )`,
    ],
    "write"
  );
}

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const { name, loginId, password } = req.body || {};
    const normalizedLoginId = typeof loginId === "string" ? loginId.trim().toLowerCase() : "";
    if (typeof name !== "string" || !name.trim() || !normalizedLoginId) {
      return res.status(400).json({ error: "Enter your name and Student ID or email." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    if (password.length > 256 || normalizedLoginId.length > 254 || name.trim().length > 120) {
      return res.status(400).json({ error: "One or more fields exceed the allowed length." });
    }

    const initialData = req.body.initialData ?? emptyData;
    if (!validateData(initialData)) {
      return res.status(400).json({ error: "Invalid academic data provided." });
    }

    const user = { id: randomUUID(), name: name.trim(), idLabel: normalizedLoginId };
    await db.batch(
      [
        {
          sql: "INSERT INTO app_users (id, name, login_id, password_hash) VALUES (?, ?, ?, ?)",
          args: [user.id, user.name, normalizedLoginId, await passwordHash(password)],
        },
        {
          sql: "INSERT INTO student_data (user_id, payload) VALUES (?, ?)",
          args: [user.id, JSON.stringify(initialData)],
        },
      ],
      "write"
    );
    await createSession(user.id, res);
    return res.status(201).json({ user });
  } catch (error) {
    if (String(error.message).includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "An account with that Student ID or email already exists." });
    }
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { loginId, password } = req.body || {};
    const normalizedLoginId = typeof loginId === "string" ? loginId.trim().toLowerCase() : "";
    if (!normalizedLoginId || typeof password !== "string") {
      return res.status(400).json({ error: "Enter your Student ID or email and password." });
    }

    const result = await db.execute({
      sql: "SELECT id, name, login_id, password_hash FROM app_users WHERE login_id = ?",
      args: [normalizedLoginId],
    });
    const row = result.rows[0];
    const valid = row
      ? await verifyPassword(password, row.password_hash)
      : await verifyPassword(password, await passwordHash("invalid-login"));
    if (!valid || !row) {
      return res.status(401).json({ error: "Incorrect Student ID/email or password." });
    }

    await createSession(row.id, res);
    return res.json({ user: { id: row.id, name: row.name, idLabel: row.login_id } });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/auth/me", requireSession, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/logout", requireSession, async (req, res, next) => {
  try {
    await db.execute({
      sql: "DELETE FROM app_sessions WHERE token_hash = ?",
      args: [req.sessionHash],
    });
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/data", requireSession, async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: "SELECT payload FROM student_data WHERE user_id = ?",
      args: [req.user.id],
    });
    const data = result.rows.length ? JSON.parse(result.rows[0].payload) : emptyData;
    return res.json({ data });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/data", requireSession, async (req, res, next) => {
  try {
    if (!validateData(req.body)) {
      return res.status(400).json({ error: "Invalid academic data provided." });
    }
    await db.execute({
      sql: `INSERT INTO student_data (user_id, payload, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              payload = excluded.payload,
              updated_at = CURRENT_TIMESTAMP`,
      args: [req.user.id, JSON.stringify(req.body)],
    });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});

app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));

app.use(express.static(path.join(root, "dist")));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  return res.sendFile(path.join(root, "dist", "index.html"));
});

app.use((error, req, res, next) => {
  console.error("Request failed:", error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: "The server could not complete the request." });
});

initializeDatabase()
  .then(() => {
    app.listen(port, () => console.log(`Academia server listening on port ${port}`));
  })
  .catch((error) => {
    console.error("Could not initialize Turso database:", error);
    process.exitCode = 1;
  });
