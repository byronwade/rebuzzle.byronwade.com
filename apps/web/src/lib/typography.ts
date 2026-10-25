const OPENS_QUOTE = /[\s([{—–-]/;

/**
 * Generated copy arrives with typewriter quotes ("Today's", 'aha!').
 * Swap them for curly quotes and turn "..." into an ellipsis. A quote opens
 * at the start of the text or after whitespace or an opening bracket, and
 * closes everywhere else, so apostrophes come out as ’.
 */
export function smartQuotes(text: string, before = ""): string {
  return text
    .replace(/["']/g, (quote: string, offset: number) => {
      const prev = offset === 0 ? before : text.charAt(offset - 1);
      const opens = prev === "" || OPENS_QUOTE.test(prev);
      if (quote === '"') return opens ? "“" : "”";
      return opens ? "‘" : "’";
    })
    .replace(/\.\.\./g, "…");
}

/** Turn a catalog slug like "alarm-clock" into a sentence-case label: "Alarm clock". */
export function labelFromSlug(slug: string): string {
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
