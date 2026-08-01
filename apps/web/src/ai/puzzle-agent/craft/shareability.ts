/**
 * Shareability preview — would the unicodeFallback look like a fair board in a tweet?
 */

export type ShareabilityResult = {
  ok: boolean;
  score: number;
  problems: string[];
};

/**
 * Reject emoji salad / answer leaks / empty share text.
 */
export function scoreShareability(input: {
  unicodeFallback: string;
  answer: string;
  pictogramCount?: number;
  hasStyledText?: boolean;
}): ShareabilityResult {
  const problems: string[] = [];
  const display = (input.unicodeFallback || "").trim();
  const answer = input.answer.trim().toLowerCase();

  if (!display) {
    return { ok: false, score: 0, problems: ["Missing unicodeFallback share text"] };
  }

  let score = 62;

  if (display.toLowerCase().includes(answer) && answer.length > 2) {
    problems.push("Share text leaks the answer");
    score -= 40;
  }

  const emojiMatches = display.match(/\p{Extended_Pictographic}/gu) ?? [];
  const emojiCount = emojiMatches.length;
  const hasOperators = /[+\-×÷=/<>^v]|⬇️|⬆️|➡️|⬅️/.test(display);
  const hasLetters = /[a-zA-Z]{2,}/.test(display);

  // Pure emoji dump with no structure
  if (emojiCount >= 5 && !hasOperators && !hasLetters) {
    problems.push("Share text looks like unstructured emoji salad");
    score -= 25;
  }

  if (emojiCount === 0 && !hasLetters && (input.pictogramCount ?? 0) > 0) {
    problems.push("Share text doesn't describe the pictogram board");
    score -= 15;
  }

  if (emojiCount >= 1 && emojiCount <= 4) score += 10;
  if (hasOperators || hasLetters) score += 12;
  if (input.hasStyledText) score += 6;
  if ((input.pictogramCount ?? 0) >= 1 && emojiCount >= 1) score += 8;

  // Too long for social
  if (display.length > 120) {
    problems.push("Share text too long for a clean first glance");
    score -= 8;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { ok: problems.length === 0 && score >= 55, score, problems };
}
