const INLINE_STEP = /(\s*)(\d+)\.\s+(?=\*\*)/g;

/**
 * Generated sections often run numbered steps into the paragraph
 * ("approach:1. **Look** ... clue.2. **Say** ..."), which markdown renders as
 * one wall of text. Break each bold-led step onto its own list line.
 *
 * Works line by line and leaves a marker alone when only indentation or
 * blockquote markers come before it, so nested and quoted lists keep their
 * structure.
 */
export function separateInlineSteps(body: string): string {
  return body
    .split("\n")
    .map((line) =>
      line.replace(INLINE_STEP, (match, _space: string, step: string, offset: number) => {
        const before = line.slice(0, offset);
        if (/^[\s>]*$/.test(before) || /\d$/.test(before)) return match;
        return `\n\n${step}. `;
      })
    )
    .join("\n");
}
