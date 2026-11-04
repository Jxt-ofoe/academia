import { getData, putData } from "./_lib/handlers.js";

export default function handler(req, res) {
  if (req.method === "GET") return getData(req, res);
  if (req.method === "PUT") return putData(req, res);
  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed." });
}
