/**
 * Decode a Base64-encoded string into a Buffer.
 */
function decodeBase64(base64String) {
  return Buffer.from(base64String, 'base64');
}

/**
 * Encode a Buffer into a Base64 string.
 */
function encodeBase64(buffer) {
  return buffer.toString('base64');
}

/**
 * Derive a safe filename by stripping path separators and null bytes.
 */
function sanitizeFilename(filename) {
  return filename.replace(/[/\\:\0]/g, '_');
}

module.exports = { decodeBase64, encodeBase64, sanitizeFilename };
