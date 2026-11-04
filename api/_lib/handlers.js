import { createClient as createNodeClient } from "@libsql/client";
import { createClient as createHttpClient } from "@libsql/client/http";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;
const emptyData = { slots: [], tests: [], courses: [] };
const dataKeys = Object.keys(emptyData);
let db;
let initialization;

function getDatabase() {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    const error = new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured in the server environment."
    );
    error.statusCode = 503;
    throw error;
  }
  if (!db) {
    // Vercel serverless functions don't support native libsql bindings,
    // so use the HTTP transport when not running locally via server.js.
    const isServerless = !!process.env.VERCEL;
    const createClient = isServerless ? createHttpClient : createNodeClient;
    db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return db;
}

export async function initializeDatabase() {
  if (!initialization) {
    initialization = (async () => {
      const client = getDatabase();
      await client.batch(
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
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getCookie(req, name) {
  const cookies = req.headers.cookie?.split(";") || [];
  const cookie = cookies.find((part) => part.trim().startsWith(`${name}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.trim().slice(name.length + 1));
  } catch {
    return null;
  }
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

function sendJson(res, status, payload) {
  if (typeof res.status === "function" && typeof res.json === "function") {
    return res.status(status).json(payload);
  }
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
}

function sendEmpty(res, status) {
  if (typeof res.status === "function") return res.status(status).end();
  res.statusCode = status;
  return res.end();
}

function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function validateData(data) {
  return (
    data &&
    typeof data === "object" &&
    dataKeys.every((key) => Array.isArray(data[key]) && data[key].length <= 500)
  );
}

async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actualHex = (await passwordHash(password, salt)).split(":")[1];
  const actual = Buffer.from(actualHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function createSession(userId, res) {
  const client = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  await client.execute({
    sql: "INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
    args: [hashToken(token), userId, expiresAt],
  });
  setSessionCookie(res, token);
}

async function authenticatedUser(req, res) {
  const token = getCookie(req, "academia_session");
  if (!token) {
    sendJson(res, 401, { error: "Please sign in." });
    return null;
  }

  const result = await getDatabase().execute({
    sql: `SELECT u.id, u.name, u.login_id
          FROM app_sessions s
          JOIN app_users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [hashToken(token), new Date().toISOString()],
  });
  if (!result.rows.length) {
    clearSessionCookie(res);
    sendJson(res, 401, { error: "Your session has expired. Please sign in again." });
    return null;
  }
  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    idLabel: row.login_id,
    sessionHash: hashToken(token),
  };
}

async function run(req, res, operation) {
  try {
    await initializeDatabase();
    return await operation();
  } catch (error) {
    if (error.statusCode) {
      return sendJson(res, error.statusCode, { error: error.message });
    }
    console.error("API request failed:", error);
    return sendJson(res, 500, { error: "The server could not complete the request." });
  }
}

export function signup(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  return run(req, res, async () => {
    const body = readBody(req) || {};
    const { name, loginId, password } = body;
    const normalizedLoginId = typeof loginId === "string" ? loginId.trim().toLowerCase() : "";
    if (typeof name !== "string" || !name.trim() || !normalizedLoginId) {
      return sendJson(res, 400, { error: "Enter your name and Student ID or email." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return sendJson(res, 400, { error: "Password must be at least 8 characters." });
    }
    if (password.length > 256 || normalizedLoginId.length > 254 || name.trim().length > 120) {
      return sendJson(res, 400, { error: "One or more fields exceed the allowed length." });
    }

    const initialData = body.initialData ?? emptyData;
    if (!validateData(initialData)) {
      return sendJson(res, 400, { error: "Invalid academic data provided." });
    }
    const user = { id: randomUUID(), name: name.trim(), idLabel: normalizedLoginId };
    try {
      await getDatabase().batch(
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
    } catch (error) {
      if (String(error.message).includes("UNIQUE constraint failed")) {
        return sendJson(res, 409, {
          error: "An account with that Student ID or email already exists.",
        });
      }
      throw error;
    }
    await createSession(user.id, res);
    return sendJson(res, 201, { user });
  });
}

export function login(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  return run(req, res, async () => {
    const body = readBody(req) || {};
    const { loginId, password } = body;
    const normalizedLoginId = typeof loginId === "string" ? loginId.trim().toLowerCase() : "";
    if (!normalizedLoginId || typeof password !== "string") {
      return sendJson(res, 400, { error: "Enter your Student ID or email and password." });
    }

    const result = await getDatabase().execute({
      sql: "SELECT id, name, login_id, password_hash FROM app_users WHERE login_id = ?",
      args: [normalizedLoginId],
    });
    const row = result.rows[0];
    const valid = row
      ? await verifyPassword(password, row.password_hash)
      : await verifyPassword(password, await passwordHash("invalid-login"));
    if (!valid || !row) {
      return sendJson(res, 401, { error: "Incorrect Student ID/email or password." });
    }

    await createSession(row.id, res);
    return sendJson(res, 200, {
      user: { id: row.id, name: row.name, idLabel: row.login_id },
    });
  });
}

export function me(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  return run(req, res, async () => {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    return sendJson(res, 200, {
      user: { id: user.id, name: user.name, idLabel: user.idLabel },
    });
  });
}

export function logout(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  return run(req, res, async () => {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    await getDatabase().execute({
      sql: "DELETE FROM app_sessions WHERE token_hash = ?",
      args: [user.sessionHash],
    });
    clearSessionCookie(res);
    return sendEmpty(res, 204);
  });
}

export function getData(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  return run(req, res, async () => {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    const result = await getDatabase().execute({
      sql: "SELECT payload FROM student_data WHERE user_id = ?",
      args: [user.id],
    });
    return sendJson(res, 200, {
      data: result.rows.length ? JSON.parse(result.rows[0].payload) : emptyData,
    });
  });
}

export function putData(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", "PUT");
    return sendJson(res, 405, { error: "Method not allowed." });
  }
  return run(req, res, async () => {
    const user = await authenticatedUser(req, res);
    if (!user) return;
    const data = readBody(req);
    if (!validateData(data)) {
      return sendJson(res, 400, { error: "Invalid academic data provided." });
    }
    await getDatabase().execute({
      sql: `INSERT INTO student_data (user_id, payload, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              payload = excluded.payload,
              updated_at = CURRENT_TIMESTAMP`,
      args: [user.id, JSON.stringify(data)],
    });
    return sendEmpty(res, 204);
  });
}
