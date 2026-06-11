const { put } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { fileName, imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      res.status(400).json({ error: "Missing imageDataUrl" });
      return;
    }

    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: "Invalid imageDataUrl" });
      return;
    }

    const contentType = match[1] || "image/png";
    const buffer = Buffer.from(match[2], "base64");
    const extension = getExtension(fileName, contentType);
    const safeName = sanitizeName(fileName || `upload.${extension}`);
    const pathname = `aivideobox/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    res.status(200).json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    res.status(500).json({
      error: "Image upload failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

function sanitizeName(name) {
  return String(name)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function getExtension(fileName, contentType) {
  const fromName = String(fileName || "").split(".").pop();
  if (fromName && fromName.length <= 5 && fromName !== fileName) return fromName.toLowerCase();
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "png";
}
