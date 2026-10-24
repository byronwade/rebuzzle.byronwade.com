/**
 * Generated sections often run numbered steps into the paragraph
 * ("approach:1. **Look** ... clue.2. **Say** ..."), which markdown renders as
 * one wall of text. Break each bold-led step onto its own list line.
 */
export function separateInlineSteps(body: string): string {
  return body.replace(/([^\n\d])(\d+)\.\s+(?=\*\*)/g, "$1\n\n$2. ");
}
