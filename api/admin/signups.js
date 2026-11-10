import { del, list } from "@vercel/blob";
import { readJson, requireAdmin, send } from "../_lib.js";

// GET lists every sign-up (newest first); DELETE { urls: [...] } removes some.
function parse(blob) {
  const m = blob.pathname.match(/^signups\/(\d+)-([A-Za-z0-9_-]+?)(?:-[A-Za-z0-9]+)?\.json$/);
  if (!m) return null;
  try {
    const { e, n } = JSON.parse(Buffer.from(m[2], "base64url").toString("utf8"));
    return { url: blob.url, email: e, name: n || "", at: new Date(Number(m[1])).toISOString() };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const out = [];
    let cursor;
    do {
      const page = await list({ prefix: "signups/", limit: 1000, cursor });
      for (const b of page.blobs) { const s = parse(b); if (s) out.push(s); }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    out.sort((a, b) => b.at.localeCompare(a.at));
    return send(res, 200, out);
  }

  if (req.method === "DELETE") {
    let body = {};
    try { body = await readJson(req); } catch {}
    const urls = (Array.isArray(body.urls) ? body.urls : []).filter(
      (u) => typeof u === "string" && /\/signups\//.test(u)
    );
    if (urls.length) await del(urls);
    return send(res, 200, { ok: true, deleted: urls.length });
  }
  send(res, 405, { error: "Method not allowed" });
}
