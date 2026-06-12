const crypto = require("crypto");
const { list, put } = require("@vercel/blob");

const CODES_PATH = "aivideobox/auth/access-codes.json";
const COOKIE_NAME = "aivideobox_session";
const SESSION_DAYS = 7;

module.exports = async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");

    if (req.method === "GET") {
      const session = verifySession(readCookie(req, COOKIE_NAME));
      res.status(200).json({ authenticated: Boolean(session), session });
      return;
    }

    if (req.method === "DELETE") {
      clearSessionCookie(res);
      res.status(200).json({ ok: true });
      return;
    }

    if (req.method === "POST") {
      const code = String(req.body?.code || "").trim();
      if (!code) {
        res.status(400).json({ error: "请输入访问口令。" });
        return;
      }

      const matched = await findMatchingCode(code);
      if (!matched) {
        res.status(401).json({ error: "访问口令无效或已停用。" });
        return;
      }

      setSessionCookie(res, signSession({ codeId: matched.id, name: matched.name || "访问用户" }));
      res.status(200).json({ ok: true, user: { name: matched.name || "访问用户" } });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
};

async function findMatchingCode(code) {
  const hash = hashCode(code);
  const bootstrap = process.env.ACCESS_BOOTSTRAP_KEY || process.env.ACCESS_CODE || "";
  if (bootstrap && hashCode(bootstrap) === hash) {
    return { id: "bootstrap", name: "管理员预置口令", active: true };
  }

  const store = await readCodeStore();
  return (store.codes || []).find((item) => item.active !== false && item.hash === hash) || null;
}

async function readCodeStore() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { codes: [] };
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

async function findBlob(pathname) {
  const result = await list({ prefix: pathname, limit: 10 });
  return result.blobs.find((blob) => blob.pathname === pathname) || null;
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function signSession(payload) {
  const secret = getSessionSecret();
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60;
  const body = base64url(JSON.stringify({ ...payload, exp }));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token = "") {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { name: payload.name || "访问用户", codeId: payload.codeId || "" };
  } catch {
    return null;
  }
}

function getSessionSecret() {
  return process.env.ACCESS_SESSION_SECRET || process.env.ACCESS_ADMIN_KEY || process.env.BLOB_READ_WRITE_TOKEN || "aivideobox-dev-secret";
}

function setSessionCookie(res, token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function readCookie(req, name) {
  const cookie = req.headers.cookie || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function timingSafeEqual(a = "", b = "") {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
