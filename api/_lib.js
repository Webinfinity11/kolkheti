import crypto from "node:crypto";
import { list } from "@vercel/blob";
import { DEFAULTS } from "./_defaults.js";

// ---------- Responses ----------
export function send(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export async function readRaw(req, limit = 4 * 1024 * 1024) {
  // Vercel's runtime may have read the stream into req.body already
  const pre = req.body;
  if (Buffer.isBuffer(pre)) {
    if (pre.length > limit) throw Object.assign(new Error("Too large"), { status: 413 });
    return pre;
  }
  if (typeof pre === "string" && pre.length) return Buffer.from(pre, "binary");
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error("Too large"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = await readRaw(req, 1024 * 1024);
  return raw.length ? JSON.parse(raw.toString("utf8")) : {};
}

// ---------- Admin session ----------
// The cookie is "<expiry>.<hmac>", signed with ADMIN_SECRET. No server state.
const COOKIE = "mk_admin";
const TTL = 7 * 24 * 3600; // a week

function sign(value) {
  return crypto.createHmac("sha256", process.env.ADMIN_SECRET || "").update(value).digest("base64url");
}

function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function checkLogin(username, password) {
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;
  if (!u || !p || !process.env.ADMIN_SECRET) return false;
  // Evaluate both so a wrong username takes as long as a wrong password
  const okU = same(username || "", u);
  const okP = same(password || "", p);
  return okU && okP;
}

export function sessionCookie() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  return `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
}

export const clearCookie = `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export function isAdmin(req) {
  const m = (req.headers.cookie || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m || !process.env.ADMIN_SECRET) return false;
  const [exp, mac] = m[1].split(".");
  if (!exp || !mac || !same(mac, sign(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

export function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  send(res, 401, { error: "Not signed in" });
  return false;
}

// ---------- Content ----------
// Every save writes a new content/<timestamp>.json; the newest one wins. A new
// URL per save means the blob CDN never serves a stale copy.
export const CONTENT_PREFIX = "content/";

export async function latestContentBlobs() {
  const { blobs } = await list({ prefix: CONTENT_PREFIX, limit: 1000 });
  return blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export async function readContent() {
  const [latest] = await latestContentBlobs();
  if (!latest) return normalize(DEFAULTS);
  const r = await fetch(latest.url, { cache: "no-store" });
  if (!r.ok) throw new Error("Could not read content");
  return normalize(await r.json());
}

const str = (v, fallback = "", max = 4000) =>
  (typeof v === "string" ? v : fallback).slice(0, max).trim();
const color = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(v || "") ? v : fallback);
const url = (v) => (typeof v === "string" && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : "");

function section(input, def) {
  const s = input && typeof input === "object" ? input : {};
  const meta = Array.isArray(s.meta) ? s.meta : def.meta;
  const items = Array.isArray(s.items) ? s.items : def.items;
  return {
    tag: str(s.tag, def.tag, 80),
    title: str(s.title, def.title, 200),
    intro: str(s.intro, def.intro),
    meta: meta.slice(0, 6).map((m) => ({
      value: str(m?.value, "", 80),
      label: str(m?.label, "", 80),
    })),
    closingTitle: str(s.closingTitle, def.closingTitle, 200),
    closingText: str(s.closingText, def.closingText),
    items: items.slice(0, 200).map((it) => ({
      name: str(it?.name, "", 200),
      medium: str(it?.medium, "", 300),
      note: str(it?.note),
      image: url(it?.image),
      a: color(it?.a, "#17171a"),
      b: color(it?.b, "#2a2a30"),
    })),
  };
}

// Shapes whatever comes in (an old save, an admin request) into the full
// content object, so the pages never meet a missing field.
export function normalize(input) {
  const c = input && typeof input === "object" ? input : {};
  return {
    contact: { email: str(c.contact?.email, DEFAULTS.contact.email, 200) },
    home: {
      signupTitle: str(c.home?.signupTitle, DEFAULTS.home.signupTitle, 200),
      signupLead: str(c.home?.signupLead, DEFAULTS.home.signupLead),
    },
    artists: section(c.artists, DEFAULTS.artists),
    jewelry: section(c.jewelry, DEFAULTS.jewelry),
  };
}
