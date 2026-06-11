const { del, list, put } = require("@vercel/blob");

const INDEX_PATH = "aivideobox/shared/projects-index.json";
const PROJECT_PREFIX = "aivideobox/shared/projects/";
const DELETED_PREFIX = "aivideobox/shared/deleted/";

module.exports = async function handler(req, res) {
  try {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    if (req.method === "GET") {
      if (isBlobUnavailable()) {
        res.status(200).json({ projects: [], deleted: {}, disabled: true, message: "Vercel Blob is not configured." });
        return;
      }
      const name = String(req.query?.name || "").trim();
      if (name) {
        const data = await readJsonBlob(projectPath(name), { nodes: [], connections: [], memories: [] });
        res.status(200).json({ name, data });
        return;
      }
      const index = await readJsonBlob(INDEX_PATH, { projects: [], deleted: {} });
      const deleted = mergeDeleted(index.deleted, await getDeletedNames());
      const projects = mergeProjects(index.projects || [], [], deleted);
      res.status(200).json({ ...index, projects, deleted });
      return;
    }

    if (req.method === "POST") {
      if (isBlobUnavailable()) {
        res.status(200).json({ ok: false, disabled: true, message: "Vercel Blob is not configured." });
        return;
      }
      const body = req.body || {};
      if (body.type === "list") {
        const projects = Array.isArray(body.projects) ? body.projects : [];
        const deletedNames = Array.isArray(body.deletedNames) ? body.deletedNames : [];
        const current = await readJsonBlob(INDEX_PATH, { projects: [], deleted: {} });
        const deleted = mergeDeleted(current.deleted, [...deletedNames, ...(await getDeletedNames())]);
        const merged = mergeProjects(current.projects, projects, deleted);
        await writeJsonBlob(INDEX_PATH, { projects: merged, deleted });
        res.status(200).json({ ok: true, projects: merged, deleted });
        return;
      }

      if (body.type === "project") {
        const name = String(body.name || "").trim();
        if (!name) {
          res.status(400).json({ error: "Missing project name" });
          return;
        }
        const incoming = body.data || { nodes: [], connections: [], memories: [] };
        const existing = await readJsonBlob(projectPath(name), { nodes: [], connections: [], memories: [] });
        if (hasNodes(existing) && !hasNodes(incoming)) {
          res.status(409).json({ error: "Refusing to overwrite a non-empty project with empty data" });
          return;
        }
        await clearDeletedProject(name);
        await writeJsonBlob(projectPath(name), incoming);
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: "Unknown shared project action" });
      return;
    }

    if (req.method === "DELETE") {
      if (isBlobUnavailable()) {
        res.status(200).json({ ok: false, disabled: true, message: "Vercel Blob is not configured." });
        return;
      }
      const name = String(req.query?.name || "").trim();
      if (!name) {
        res.status(400).json({ error: "Missing project name" });
        return;
      }
      try {
        await del(projectPath(name));
      } catch {
        // The index tombstone is more important than the blob delete succeeding.
      }
      await writeJsonBlob(deletedPath(name), { name, deletedAt: Date.now() });
      const current = await readJsonBlob(INDEX_PATH, { projects: [], deleted: {} });
      const deleted = mergeDeleted(current.deleted, [name, ...(await getDeletedNames())]);
      await writeJsonBlob(INDEX_PATH, {
        projects: mergeProjects(current.projects, [], deleted),
        deleted,
      });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /suspended|not configured|missing token|unauthorized/i.test(message) ? 200 : 500;
    res.status(status).json({
      error: "Shared project storage failed",
      disabled: status === 200,
      message,
    });
  }
};

function isBlobUnavailable() {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

function projectPath(name) {
  return `${PROJECT_PREFIX}${encodeURIComponent(name)}.json`;
}

function deletedPath(name) {
  return `${DELETED_PREFIX}${encodeURIComponent(name)}.json`;
}

async function clearDeletedProject(name) {
  try {
    await del(deletedPath(name));
  } catch {
    // It is fine if the project was not previously deleted.
  }
  const current = await readJsonBlob(INDEX_PATH, { projects: [], deleted: {} });
  if (current.deleted && Object.prototype.hasOwnProperty.call(current.deleted, name)) {
    delete current.deleted[name];
    await writeJsonBlob(INDEX_PATH, current);
  }
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
  const result = await list({ prefix: pathname, limit: 100 });
  return result.blobs.find((blob) => blob.pathname === pathname) || null;
}

async function getDeletedNames() {
  const names = [];
  let cursor;
  do {
    const result = await list({ prefix: DELETED_PREFIX, cursor, limit: 1000 });
    result.blobs.forEach((blob) => {
      const file = blob.pathname.slice(DELETED_PREFIX.length).replace(/\.json$/, "");
      if (file) names.push(decodeURIComponent(file));
    });
    cursor = result.cursor;
  } while (cursor);
  return names;
}

function mergeDeleted(existing = {}, deletedNames = []) {
  const deleted = existing && typeof existing === "object" && !Array.isArray(existing) ? { ...existing } : {};
  deletedNames.forEach((name) => {
    const key = String(name || "").trim();
    if (key) deleted[key] = Date.now();
  });
  return deleted;
}

function hasNodes(data) {
  return Array.isArray(data?.nodes) && data.nodes.length > 0;
}

function mergeProjects(existing = [], incoming = [], deleted = {}) {
  const deletedSet = new Set(Object.keys(deleted || {}));
  const byName = new Map();
  [...existing, ...incoming].forEach((project) => {
    const name = String(project?.name || "").trim();
    if (!name || deletedSet.has(name)) return;
    byName.set(name, {
      name,
      date: project.date || new Date().toLocaleDateString("zh-CN"),
      code: project.code || "",
    });
  });
  return [...byName.values()];
}
