import { checkLogin, clearCookie, isAdmin, readJson, send, sessionCookie } from "../_lib.js";

// POST signs in, DELETE signs out, GET says whether the session is valid.
export default async function handler(req, res) {
  if (req.method === "GET") return send(res, 200, { ok: isAdmin(req) });
  if (req.method === "DELETE") return send(res, 200, { ok: true }, { "Set-Cookie": clearCookie });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  let body = {};
  try { body = await readJson(req); } catch {}
  if (!checkLogin(body.username, body.password)) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return send(res, 401, { error: "მომხმარებელი ან პაროლი არასწორია" });
  }
  send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie() });
}
