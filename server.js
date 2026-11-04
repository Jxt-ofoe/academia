import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getData,
  initializeDatabase,
  login,
  logout,
  me,
  putData,
  signup,
} from "./api/_lib/handlers.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.post("/api/auth/signup", signup);
app.post("/api/auth/login", login);
app.get("/api/auth/me", me);
app.post("/api/auth/logout", logout);
app.route("/api/data").get(getData).put(putData);
app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));

app.use(express.static(path.join(root, "dist")));
app.get(/.*/, (req, res) => res.sendFile(path.join(root, "dist", "index.html")));

initializeDatabase()
  .then(() => {
    app.listen(port, () => console.log(`Academia server listening on port ${port}`));
  })
  .catch((error) => {
    console.error("Could not initialize Turso database:", error);
    process.exitCode = 1;
  });
