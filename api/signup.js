import { put } from "@vercel/blob";
import { readJson, send } from "./_lib.js";

// Public: the Next Exhibition form. Each sign-up is its own small blob, with
// the email and name also packed into the path so the admin list needs no
// extra reads.
export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { error: "Bad request" });
  }
  if (body.botcheck) return send(res, 200, { ok: true });

  const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
  const name = String(body.name || "").trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return send(res, 400, { error: "Please enter a valid email address." });
  }

  const at = new Date().toISOString();
  const key = Buffer.from(JSON.stringify({ e: email, n: name })).toString("base64url");
  try {
    await put(`signups/${Date.now()}-${key}.json`, JSON.stringify({ email, name, at }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    });
    send(res, 200, { ok: true });
  } catch {
    send(res, 500, { error: "Something went wrong. Please try again." });
  }
}
