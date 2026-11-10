import { put } from "@vercel/blob";
import { readRaw, requireAdmin, send } from "../_lib.js";

// Raw image bytes in the body. The admin page shrinks photos to WebP before
// sending, so they stay well under the 4.5 MB function limit.
const TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  // Sent as application/octet-stream (image/* bodies are not handed to the
  // function), with the real type in X-Image-Type.
  const type = String(req.headers["x-image-type"] || "").split(";")[0];
  const ext = TYPES[type];
  if (!ext) return send(res, 415, { error: "მხოლოდ WebP, JPG ან PNG" });
  try {
    const data = await readRaw(req);
    if (!data.length) return send(res, 400, { error: "ცარიელი ფაილი" });
    const blob = await put(`images/${Date.now()}.${ext}`, data, {
      access: "public",
      contentType: type,
      addRandomSuffix: true,
      cacheControlMaxAge: 31536000,
    });
    send(res, 200, { url: blob.url });
  } catch (e) {
    send(res, e.status || 500, { error: e.status === 413 ? "ფაილი ძალიან დიდია" : "ატვირთვა ვერ მოხერხდა" });
  }
}
