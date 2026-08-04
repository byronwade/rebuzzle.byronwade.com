/**
 * Deterministic content-safety heuristics for Studio submissions.
 * Fail closed on PII, lure URLs, injection, and clearly unsafe language.
 */

export type SafetyFinding = {
  code: string;
  message: string;
  field?: string;
};

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/i;
const LURE_RE =
  /\b(?:click here|scan (?:this )?qr|bit\.ly|tinyurl|free (?:iphone|gift card)|whatsapp\.me)\b/i;
const INJECTION_RE =
  /\b(?:ignore (?:all |previous )?instructions|system prompt|you are now|jailbreak|developer mode)\b/i;

/** Conservative denylist — family product, not a general moderation API. */
const UNSAFE_TERMS = [
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "rape",
  "rapist",
  "pedophile",
  "child porn",
  "kill yourself",
  "kys",
  "onlyfans",
  "porn",
  "xxx",
];

const MAX = {
  answer: 80,
  explanation: 1200,
  hint: 160,
  hints: 6,
  layers: 12,
  title: 80,
} as const;

function scanText(text: string, field: string): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  const lower = text.toLowerCase();

  if (EMAIL_RE.test(text)) {
    findings.push({ code: "pii_email", message: "Remove email addresses from puzzle copy", field });
  }
  if (PHONE_RE.test(text)) {
    findings.push({ code: "pii_phone", message: "Remove phone numbers from puzzle copy", field });
  }
  if (URL_RE.test(text) || LURE_RE.test(text)) {
    findings.push({
      code: "external_lure",
      message: "Links and external lures are not allowed in Studio puzzles",
      field,
    });
  }
  if (INJECTION_RE.test(text)) {
    findings.push({
      code: "injection",
      message: "Text looks like it tries to override Eve — rewrite in plain language",
      field,
    });
  }
  for (const term of UNSAFE_TERMS) {
    if (lower.includes(term)) {
      findings.push({
        code: "unsafe_language",
        message: "Language must stay family-friendly for a national daily",
        field,
      });
      break;
    }
  }
  return findings;
}

export function validateStudioPayloadBounds(input: {
  title?: string;
  answer: string;
  explanation: string;
  hints: string[];
  layersLength: number;
}): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  if (!input.answer.trim()) {
    findings.push({ code: "empty_answer", message: "Answer is required", field: "answer" });
  }
  if (input.answer.length > MAX.answer) {
    findings.push({ code: "answer_long", message: "Answer is too long", field: "answer" });
  }
  if (input.explanation.length > MAX.explanation) {
    findings.push({
      code: "explanation_long",
      message: "Explanation is too long",
      field: "explanation",
    });
  }
  if (input.hints.length > MAX.hints) {
    findings.push({ code: "too_many_hints", message: "Too many hints", field: "hints" });
  }
  for (const [index, hint] of input.hints.entries()) {
    if (hint.length > MAX.hint) {
      findings.push({
        code: "hint_long",
        message: `Hint ${index + 1} is too long`,
        field: `hints[${index}]`,
      });
    }
  }
  if (input.layersLength < 1) {
    findings.push({ code: "empty_board", message: "Add at least one board piece", field: "layers" });
  }
  if (input.layersLength > MAX.layers) {
    findings.push({ code: "too_many_layers", message: "Too many board layers", field: "layers" });
  }
  if (input.title && input.title.length > MAX.title) {
    findings.push({ code: "title_long", message: "Title is too long", field: "title" });
  }
  return findings;
}

export function scanStudioContentSafety(input: {
  title?: string;
  answer: string;
  explanation: string;
  hints: string[];
  rebusPuzzle?: string;
}): SafetyFinding[] {
  const blobs: Array<{ field: string; text: string }> = [
    { field: "answer", text: input.answer },
    { field: "explanation", text: input.explanation },
    ...input.hints.map((hint, index) => ({ field: `hints[${index}]`, text: hint })),
  ];
  if (input.title) blobs.push({ field: "title", text: input.title });
  if (input.rebusPuzzle) blobs.push({ field: "board", text: input.rebusPuzzle });

  return blobs.flatMap(({ field, text }) => (text ? scanText(text, field) : []));
}

export function partitionSafetyFindings(findings: SafetyFinding[]): {
  familyFriendly: SafetyFinding[];
  pii: SafetyFinding[];
  injection: SafetyFinding[];
  lure: SafetyFinding[];
} {
  return {
    familyFriendly: findings.filter((f) => f.code === "unsafe_language"),
    pii: findings.filter((f) => f.code.startsWith("pii_")),
    injection: findings.filter((f) => f.code === "injection"),
    lure: findings.filter((f) => f.code === "external_lure"),
  };
}
