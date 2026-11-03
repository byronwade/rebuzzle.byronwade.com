const SAFE_FALLBACK = "Take another look at the nudge and notice which detail it points you toward.";
const MAX_WORDS = 24;

function words(value: string): string[] {
  return (
    value
      .normalize("NFKD")
      .toLocaleLowerCase("en-US")
      .replace(/\p{M}/gu, "")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function containsAnswer(text: string, answer: string): boolean {
  const textWords = words(text);
  const answerWords = words(answer);
  if (answerWords.length === 0) return false;

  const compactAnswer = answerWords.join("");
  for (let start = 0; start <= textWords.length - answerWords.length; start += 1) {
    if (answerWords.every((word, offset) => textWords[start + offset] === word)) return true;
  }

  // Catch direct rebus-style spacing variants such as “light house” for “lighthouse”.
  for (let start = 0; start < textWords.length; start += 1) {
    let compactWindow = "";
    for (let end = start; end < textWords.length; end += 1) {
      compactWindow += textWords[end];
      if (compactWindow === compactAnswer) return true;
      if (compactWindow.length >= compactAnswer.length) break;
    }
  }
  return false;
}

/** Keeps a short, direct-answer-safe Eve follow-up or replaces it with a fixed line. */
export function sanitizeEveNudgeReply(text: string, answer: string): string {
  const trimmed = text.trim().replace(/^["'`]+|["'`]+$/g, "");
  if (!trimmed) return SAFE_FALLBACK;

  const firstSentence = trimmed.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0]?.trim() || trimmed;
  if (firstSentence.split(/\s+/u).filter(Boolean).length > MAX_WORDS) return SAFE_FALLBACK;
  if (containsAnswer(firstSentence, answer)) return SAFE_FALLBACK;
  return firstSentence;
}
