const crypto = require("crypto");
const { list, put } = require("@vercel/blob");

const CODES_PATH = "aivideobox/auth/access-codes.json";

module.exports = async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(200).json({ disabled: true, error: "Vercel Blob is not configured." });
      return;
    }

    if (!isAdmin(req)) {
      res.status(401).json({ error: "管理员密钥无效。" });
      return;
    }

    if (req.method === "GET") {
      const store = await readCodeStore();
      res.status(200).json({ codes: sanitizeCodes(store.codes) });
      return;
    }

    if (req.method === "POST") {
      const store = await readCodeStore();
      const code = generateAccessCode();
      const item = {
        id: `code-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        name: String(req.body?.name || "访问用户").trim() || "访问用户",
        hash: hashCode(code),
        active: true,
        createdAt: new Date().toISOString(),
      };
      store.codes = [item, ...(store.codes || [])];
      await writeCodeStore(store);
      res.status(200).json({ ok: true, code, item: sanitizeCode(item) });
      return;
    }

    if (req.method === "PATCH") {
      const id = String(req.body?.id || "").trim();
      const active = Boolean(req.body?.active);
      const store = await readCodeStore();
      store.codes = (store.codes || []).map((item) => item.id === id ? { ...item, active, updatedAt: new Date().toISOString() } : item);
      await writeCodeStore(store);
      res.status(200).json({ ok: true, codes: sanitizeCodes(store.codes) });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

function isAdmin(req) {
  const expected = process.env.ACCESS_ADMIN_KEY || "";
  if (!expected) return false;
  const provided = String(req.headers["x-admin-key"] || req.body?.adminKey || "").trim();
  return provided && timingSafeEqual(provided, expected);
}

async function readCodeStore() {
  const found = await findBlob(CODES_PATH);
  if (!found?.url) return { codes: [] };
  const response = await fetch(`${found.url}${found.url.includes("?") ? "&" : "?"}t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) return { codes: [] };
  try {
    const data = await response.json();
    return { codes: Array.isArray(data.codes) ? data.codes : [] };
  } catch {
    return { codes: [] };
  }
}

async function writeCodeStore(value) {
  await put(CODES_PATH, JSON.stringify(value), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function findBlob(pathname) {
  const result = await list({ prefix: pathname, limit: 10 });
  return result.blobs.find((blob) => blob.pathname === pathname) || null;
}

function generateAccessCode() {
  return `AVB-${crypto.randomBytes(9).toString("base64url").toUpperCase()}`;
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function sanitizeCodes(codes = []) {
  return codes.map(sanitizeCode);
}

function sanitizeCode(item) {
  return {
    id: item.id,
    name: item.name || "访问用户",
    active: item.active !== false,
    createdAt: item.createdAt || "",
    updatedAt: item.updatedAt || "",
  };
}

function timingSafeEqual(a = "", b = "") {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
