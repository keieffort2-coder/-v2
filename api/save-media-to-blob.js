const { put } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(500).json({
      error: "BLOB_READ_WRITE_TOKEN is not configured",
      message: "Please configure BLOB_READ_WRITE_TOKEN in Vercel Environment Variables.",
    });
    return;
  }

  try {
    const { url, fileName, mediaType } = req.body || {};
    if (!url || typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      res.status(400).json({ error: "Missing url" });
      return;
    }

    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      res.status(response.status).json({ error: `Download media failed: HTTP ${response.status}` });
      return;
    }

    const contentType = response.headers.get("content-type")?.split(";")[0] || defaultContentType(mediaType);
    const arrayBuffer = await response.arrayBuffer();
    const extension = extensionFromContentType(contentType, mediaType);
    const safeName = sanitizeName(fileName || `saved-media.${extension}`);
    const pathname = `aivideobox/saved/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const blob = await put(pathname, Buffer.from(arrayBuffer), {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    res.status(500).json({
      error: "Save media to Blob failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

function defaultContentType(mediaType) {
  return mediaType === "video" ? "video/mp4" : "image/png";
}

function extensionFromContentType(contentType, mediaType) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  if (contentType.startsWith("video/")) return "mp4";
  if (contentType.startsWith("image/")) return contentType.slice("image/".length) || "png";
  return mediaType === "video" ? "mp4" : "png";
}

function sanitizeName(name) {
  return String(name)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}
