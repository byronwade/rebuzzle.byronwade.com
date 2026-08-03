/**
 * Serialize JSON-LD for embedding in a <script type="application/ld+json"> tag.
 * Escapes characters that would break out of the script context (XSS).
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
