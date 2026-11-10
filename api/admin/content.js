import { del, put } from "@vercel/blob";
import { CONTENT_PREFIX, latestContentBlobs, normalize, readContent, readJson, requireAdmin, send } from "../_lib.js";

const KEEP = 20; // older saves kept as history

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try { return send(res, 200, await readContent()); }
    catch { return send(res, 500, { error: "კონტენტი ვერ ჩაიტვირთა" }); }
  }
  if (req.method !== "PUT") return send(res, 405, { error: "Method not allowed" });

  let body;
  try { body = await readJson(req); } catch { return send(res, 400, { error: "Bad request" }); }
  const content = normalize(body);
  try {
    await put(`${CONTENT_PREFIX}${Date.now()}.json`, JSON.stringify(content), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    });
    const old = (await latestContentBlobs()).slice(KEEP).map((b) => b.url);
    if (old.length) await del(old).catch(() => {});
    send(res, 200, content);
  } catch {
    send(res, 500, { error: "შენახვა ვერ მოხერხდა" });
  }
}
