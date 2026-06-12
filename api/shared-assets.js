const { list, put } = require("@vercel/blob");

const ASSETS_PATH = "aivideobox/shared/assets.json";

module.exports = async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(200).json({ assets: [], disabled: true, message: "Vercel Blob is not configured." });
      return;
    }

    if (req.method === "GET") {
      const data = await readJsonBlob(ASSETS_PATH, { assets: [] });
      res.status(200).json({ assets: Array.isArray(data.assets) ? data.assets : [] });
      return;
    }

    if (req.method === "POST") {
      const incoming = Array.isArray(req.body?.assets) ? req.body.assets : [];
      const deletedIds = Array.isArray(req.body?.deletedIds) ? req.body.deletedIds.map((id) => String(id).trim()).filter(Boolean) : [];
      if (!incoming.length && !deletedIds.length) {
        res.status(200).json({ ok: false, skipped: true, message: "Refusing to overwrite shared assets with an empty list." });
        return;
      }
      const current = await readJsonBlob(ASSETS_PATH, { assets: [] });
      const merged = mergeAssets(Array.isArray(current.assets) ? current.assets : [], incoming, deletedIds);
      await writeJsonBlob(ASSETS_PATH, { assets: merged, updatedAt: new Date().toISOString() });
      res.status(200).json({ ok: true, assets: merged });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /suspended|not configured|missing token|unauthorized/i.test(message) ? 200 : 500;
    res.status(status).json({
      error: "Shared assets storage failed",
      disabled: status === 200,
      message,
    });
  }
};

function mergeAssets(existing = [], incoming = [], deletedIds = []) {
  const byId = new Map();
  const deleted = new Set(deletedIds);
  [...existing, ...incoming].forEach((asset) => {
    const id = String(asset?.id || "").trim();
    if (!id || deleted.has(id)) return;
    byId.set(id, {
      ...asset,
      id,
      updatedAt: asset.updatedAt || asset.createdAt || new Date().toISOString(),
    });
  });
  return [...byId.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
}

async function readJsonBlob(pathname, fallback) {
  const found = await findBlob(pathname);
  if (!found?.url) return fallback;
  const response = await fetch(`${found.url}${found.url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) return fallback;
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

async function writeJsonBlob(pathname, value) {
  await put(pathname, JSON.stringify(value), {
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
