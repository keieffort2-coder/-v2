const API_BASE = "https://api.apimart.ai/v1";

function getApiMartKey(channel) {
  const selected = String(channel || "b").toLowerCase();
  if (selected === "a") return process.env.APIMART_API_KEY || process.env.APIMART_TOKEN;
  return process.env.APIMART_API_KEY_2 || process.env.APIMART_TOKEN_2;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = getApiMartKey(req.body?.apimartChannel);
  if (!apiKey) {
    res.status(500).json({
      error: "APIMART_API_KEY_2 is not configured",
      message: "Please configure APIMART_API_KEY_2 in Vercel Environment Variables.",
    });
    return;
  }

  try {
    const { fileName, dataUrl } = req.body || {};
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
      res.status(400).json({ error: "Invalid dataUrl" });
      return;
    }

    const assetKind = getAssetKind(parsed.contentType);
    const endpoint = getUploadEndpoint(assetKind);
    const formData = new FormData();
    formData.append("file", new Blob([parsed.buffer], { type: parsed.contentType }), sanitizeName(fileName || `asset.${getExtension(parsed.contentType)}`));

    const upload = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const payload = await readJson(upload);
    const url = extractAssetUrl(payload);
    if (!upload.ok || !url) {
      res.status(upload.status || 502).json({
        error: "APIMart asset upload failed",
        message: findMessage(payload) || `APIMart upload failed: HTTP ${upload.status}`,
        upstream: payload,
        endpoint,
      });
      return;
    }

    res.status(200).json({ url, assetKind, endpoint, payload });
  } catch (error) {
    res.status(500).json({
      error: "APIMart asset upload failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

function parseDataUrl(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    contentType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64"),
  };
}

function getAssetKind(contentType) {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "audio";
  return "file";
}

function getUploadEndpoint(kind) {
  if (kind === "image") return "/uploads/images";
  if (kind === "video") return "/uploads/videos";
  if (kind === "audio") return "/uploads/audios";
  return "/uploads/files";
}

function extractAssetUrl(payload) {
  const candidates = [
    payload?.data?.url,
    payload?.data?.asset_url,
    payload?.data?.assetUrl,
    payload?.data?.file_url,
    payload?.data?.image_url,
    payload?.data?.video_url,
    payload?.url,
    payload?.asset_url,
    payload?.assetUrl,
    payload?.file_url,
    payload?.image_url,
    payload?.video_url,
  ];
  if (Array.isArray(payload?.data)) {
    candidates.push(payload.data[0]?.url, payload.data[0]?.asset_url, payload.data[0]?.file_url);
  }
  return candidates.find((value) => typeof value === "string" && value);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function findMessage(value, seen = new Set()) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);
  const direct = value.message || value.error || value.detail || value.code;
  const directMessage = findMessage(direct, seen);
  if (directMessage) return directMessage;
  for (const item of Object.values(value)) {
    const nested = findMessage(item, seen);
    if (nested) return nested;
  }
  return "";
}

function sanitizeName(name) {
  return String(name)
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

function getExtension(contentType) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/webm") return "webm";
  if (contentType === "video/quicktime") return "mov";
  if (contentType === "audio/mpeg") return "mp3";
  if (contentType === "audio/wav") return "wav";
  if (contentType.startsWith("video/")) return "mp4";
  if (contentType.startsWith("audio/")) return "mp3";
  return "png";
}
