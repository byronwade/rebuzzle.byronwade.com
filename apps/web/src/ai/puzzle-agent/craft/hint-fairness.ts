/**
 * Structured hint-ladder fairness beyond answer-leak checks.
 * Progression should be: device family → structure → fragment → letter nudge.
 */

import { hintLeaksAnswerEarly } from "../quality";

export type HintFairnessResult = {
  ok: boolean;
  score: number;
  problems: string[];
  tips: string[];
};

const DEVICE_WORDS =
  /\b(compound|position|over|under|between|homophone|sounds? like|size|scale|literal|idiom|brand|logo|layout|stack|operator|minus|plus)\b/i;
const STRUCTURE_WORDS =
  /\b(two|three|parts?|icons?|pictures?|words?|layers?|top|bottom|left|right|join|combine|read)\b/i;
const FRAGMENT_WORDS =
  /\b(starts with|first letter|last word|syllable|rhyme|category|theme)\b/i;

/**
 * Score whether the ladder unlocks fairly for the tier.
 */
export function scoreHintFairness(input: {
  hints: string[];
  answer: string;
  tierLabel?: string;
}): HintFairnessResult {
  const problems: string[] = [];
  const tips: string[] = [];
  const hints = input.hints.filter((h) => h.trim().length > 0);

  if (hints.length < 3) {
    return {
      ok: false,
      score: 20,
      problems: ["Need at least 3 progressive hints"],
      tips: ["Broad device → structure → fragment → optional letter nudge"],
    };
  }

  problems.push(...hintLeaksAnswerEarly(hints, input.answer));

  let score = 70;
  const early = hints.slice(0, Math.max(1, hints.length - 2));
  const mid = hints[Math.floor(hints.length / 2)] ?? "";
  const late = hints[hints.length - 2] ?? "";
  const last = hints[hints.length - 1] ?? "";

  const earlyHasDevice = early.some((h) => DEVICE_WORDS.test(h));
  const midHasStructure = STRUCTURE_WORDS.test(mid) || early.some((h) => STRUCTURE_WORDS.test(h));
  const lateHasFragment = FRAGMENT_WORDS.test(late) || FRAGMENT_WORDS.test(last);

  if (!earlyHasDevice) {
    score -= 18;
    problems.push("Early hints never name the device family (position/compound/phonetic/…)");
    tips.push("Hint 1 should say what KIND of rebus this is, not the answer");
  } else {
    score += 8;
  }

  if (!midHasStructure) {
    score -= 10;
    tips.push("Middle hints should describe how parts relate (stack, join, size)");
  } else {
    score += 6;
  }

  if (!lateHasFragment && input.tierLabel === "Impossible") {
    score -= 8;
    tips.push("Impossible ladders need a late fragment without dumping the answer");
  }

  // Last hint may nudge a letter; earlier must not
  for (let i = 0; i < hints.length - 1; i++) {
    if (/\b[a-z]\s*[_\-]\s*[a-z]/i.test(hints[i] ?? "")) {
      score -= 12;
      problems.push(`Hint ${i + 1} looks like a letter scaffold too early`);
    }
  }

  // Monotone length / specificity: later hints shouldn't be shorter fluff
  const lengths = hints.map((h) => h.trim().length);
  if (lengths[0]! > 120 && lengths[lengths.length - 1]! < 20) {
    score -= 6;
    tips.push("Final hint is too terse relative to the opener");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const ok = problems.length === 0 && score >= 55;
  return { ok, score, problems, tips };
}
