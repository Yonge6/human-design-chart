import { createHash } from "node:crypto";

export const ASSET_FINGERPRINT_LENGTH = 16;
export const ASSET_FINGERPRINT_PATTERN = /^[a-f0-9]{16}$/;
export const DATE_CACHE_VERSION_PATTERN = /(?:\?|&)v=20\d{6}(?:-\d+)?(?=&|#|["'`)\s]|$)/;

const EXTERNAL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export function isLocalReference(value) {
  const reference = String(value || "").trim();
  return Boolean(reference)
    && !reference.startsWith("#")
    && !reference.startsWith("//")
    && !EXTERNAL_SCHEME_PATTERN.test(reference);
}

export function appendAssetFingerprint(value, fingerprint) {
  if (!ASSET_FINGERPRINT_PATTERN.test(fingerprint)) {
    throw new Error(`Invalid asset fingerprint: ${fingerprint}`);
  }
  if (!isLocalReference(value)) return value;

  const fragmentIndex = value.indexOf("#");
  const beforeFragment = fragmentIndex === -1 ? value : value.slice(0, fragmentIndex);
  const fragment = fragmentIndex === -1 ? "" : value.slice(fragmentIndex);
  const separator = beforeFragment.includes("?") ? "&" : "?";
  return `${beforeFragment}${separator}v=${fingerprint}${fragment}`;
}

export function createAssetFingerprint(entries, length = ASSET_FINGERPRINT_LENGTH) {
  if (!Number.isInteger(length) || length < 12 || length > 64) {
    throw new Error("Asset fingerprint length must be between 12 and 64 characters.");
  }
  const hash = createHash("sha256");
  const sorted = [...entries].sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  ));
  for (const entry of sorted) {
    const content = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content);
    hash.update(Buffer.from(entry.path));
    hash.update(Buffer.from([0]));
    hash.update(Buffer.from(String(content.byteLength)));
    hash.update(Buffer.from([0]));
    hash.update(content);
    hash.update(Buffer.from([0]));
  }
  return hash.digest("hex").slice(0, length);
}

function rewriteHtml(content, fingerprint) {
  return content
    .replace(/(<(?:script|img|source|video)\b[^>]*?\s(?:src|poster)\s*=\s*)(["'])([^"']+)(\2)/gi,
      (match, prefix, quote, url, suffix) => `${prefix}${quote}${appendAssetFingerprint(url, fingerprint)}${suffix}`)
    .replace(/(<link\b[^>]*?\shref\s*=\s*)(["'])([^"']+)(\2)/gi,
      (match, prefix, quote, url, suffix) => `${prefix}${quote}${appendAssetFingerprint(url, fingerprint)}${suffix}`)
    .replace(/(<(?:img|source)\b[^>]*?\ssrcset\s*=\s*)(["'])([^"']+)(\2)/gi,
      (match, prefix, quote, value, suffix) => `${prefix}${quote}${rewriteSrcset(value, fingerprint)}${suffix}`);
}

export function rewriteSrcset(value, fingerprint) {
  let cursor = 0;
  let rewritten = "";

  while (cursor < value.length) {
    const whitespaceStart = cursor;
    while (/\s/.test(value[cursor] || "")) cursor += 1;
    rewritten += value.slice(whitespaceStart, cursor);
    if (cursor >= value.length) break;

    const urlStart = cursor;
    const isDataUrl = value.slice(cursor, cursor + 5).toLowerCase() === "data:";
    let sawDataPayloadComma = false;
    while (cursor < value.length) {
      const character = value[cursor];
      if (/\s/.test(character)) break;
      if (character === ",") {
        if (!isDataUrl || (sawDataPayloadComma && /\s/.test(value[cursor + 1] || ""))) break;
        sawDataPayloadComma = true;
      }
      cursor += 1;
    }

    rewritten += appendAssetFingerprint(value.slice(urlStart, cursor), fingerprint);

    const descriptorStart = cursor;
    while (cursor < value.length && value[cursor] !== ",") cursor += 1;
    rewritten += value.slice(descriptorStart, cursor);
    if (value[cursor] === ",") {
      rewritten += ",";
      cursor += 1;
    }
  }

  return rewritten;
}

function rewriteCss(content, fingerprint) {
  return content.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (match, quote, url) => `url(${quote}${appendAssetFingerprint(url, fingerprint)}${quote})`);
}

function rewriteJavaScript(content, fingerprint) {
  const rewriteQuotedUrl = (match, prefix, quote, url, suffix = "") => (
    `${prefix}${quote}${appendAssetFingerprint(url, fingerprint)}${quote}${suffix}`
  );

  return content
    .replace(/((?:import|export)\s+(?:[^"'`]*?\s+from\s+)?)(["'])(\.{1,2}\/[^"']+)(["'])/g,
      (match, prefix, quote, url) => rewriteQuotedUrl(match, prefix, quote, url))
    .replace(/(import\(\s*)(["'])(\.{1,2}\/[^"']+)(["']\s*\))/g,
      (match, prefix, quote, url, suffix) => rewriteQuotedUrl(match, prefix, quote, url, suffix.slice(1)))
    .replace(/(new\s+URL\(\s*)(["'`])(\.{1,2}\/[^"'`]+)(["'`]\s*,\s*import\.meta\.url\s*\))/g,
      (match, prefix, quote, url, suffix) => rewriteQuotedUrl(match, prefix, quote, url, suffix.slice(1)))
    .replace(/(templateUrl\s*:\s*)(["'])(\.{1,2}\/[^"']+)(["'])/g,
      (match, prefix, quote, url) => rewriteQuotedUrl(match, prefix, quote, url));
}

export function rewriteAssetReferences(content, relativePath, fingerprint) {
  if (/\.html?$/i.test(relativePath)) return rewriteHtml(content, fingerprint);
  if (/\.css$/i.test(relativePath)) return rewriteCss(content, fingerprint);
  if (/\.(?:m?js)$/i.test(relativePath)) return rewriteJavaScript(content, fingerprint);
  return content;
}
