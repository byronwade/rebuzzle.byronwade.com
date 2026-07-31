/**
 * Minimal SVG sanitizer for LLM-generated pictograms.
 * Strips scripts, event handlers, and external references.
 */

export function sanitizePictogramSvg(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;

  let svg = raw.trim();
  const fenced = svg.match(/```(?:svg)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) svg = fenced[1].trim();

  const start = svg.indexOf("<svg");
  const end = svg.lastIndexOf("</svg>");
  if (start === -1 || end === -1) return null;
  svg = svg.slice(start, end + "</svg>".length);

  // Nuke dangerous constructs
  const banned = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi,
    /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,
    /javascript:/gi,
    /data:/gi,
    /xlink:href\s*=\s*("|')\s*https?:/gi,
    /href\s*=\s*("|')\s*https?:/gi,
  ];
  for (const re of banned) {
    svg = svg.replace(re, "");
  }

  if (!svg.includes("viewBox")) {
    svg = svg.replace("<svg", '<svg viewBox="0 0 64 64"');
  }
  if (!/\bxmlns=/.test(svg)) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Size hints for inline display
  if (!/\bwidth=/.test(svg)) {
    svg = svg.replace("<svg", '<svg width="64" height="64"');
  }

  if (svg.length > 12_000) return null;
  return svg;
}
