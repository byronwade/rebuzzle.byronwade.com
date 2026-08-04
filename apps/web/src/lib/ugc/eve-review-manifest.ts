/**
 * Explicit Studio Eve review checklist — what we look for and why.
 * Surfaced to creators so the publish gate is transparent.
 */

export type ReviewPhaseId =
  | "intake"
  | "safety"
  | "structure"
  | "quality"
  | "critique"
  | "player_sim"
  | "verdict";

export type ReviewCheckId =
  | "auth_surface"
  | "payload_bounds"
  | "family_friendly"
  | "no_pii"
  | "no_injection"
  | "no_external_lure"
  | "answer_not_on_board"
  | "catalog_only_visuals"
  | "part_budget"
  | "technique_fit"
  | "hint_ladder"
  | "explanation_maps"
  | "answer_uniqueness"
  | "publish_floors"
  | "semantic_alignment"
  | "adversarial_critique"
  | "icon_recognizability"
  | "trope_freshness"
  | "player_fairness"
  | "final_verdict";

export type CheckSeverity = "block" | "warn" | "info";

export type ReviewCheckDef = {
  id: ReviewCheckId;
  phase: ReviewPhaseId;
  label: string;
  lookingFor: string;
  severity: CheckSeverity;
  /** Whether this check may call an LLM / vision model */
  spend: "none" | "llm" | "vision";
};

export type ReviewPhaseDef = {
  id: ReviewPhaseId;
  label: string;
  summary: string;
};

export const EVE_REVIEW_PHASES: ReviewPhaseDef[] = [
  {
    id: "intake",
    label: "Intake",
    summary: "Confirm the draft is well-formed before any spend.",
  },
  {
    id: "safety",
    label: "Safety",
    summary: "Keep the environment family-friendly and free of PII or lure content.",
  },
  {
    id: "structure",
    label: "Structure",
    summary: "Board craft: authentic icons, readable part count, technique fit.",
  },
  {
    id: "quality",
    label: "Quality floors",
    summary: "Deterministic grade — uniqueness, hints, explanation, fun/quality floors.",
  },
  {
    id: "critique",
    label: "Eve critique",
    summary: "Adversarial editor pass for aha, fairness, and icon clarity.",
  },
  {
    id: "player_sim",
    label: "Player simulation",
    summary: "Optional vision spend — would a stranger solve this fairly?",
  },
  {
    id: "verdict",
    label: "Verdict",
    summary: "Ship, revise, or reject — with a clear list of blockers.",
  },
];

export const EVE_REVIEW_CHECKS: ReviewCheckDef[] = [
  {
    id: "auth_surface",
    phase: "intake",
    label: "Author-only review",
    lookingFor: "Only the signed-in creator can review or publish this draft.",
    severity: "block",
    spend: "none",
  },
  {
    id: "payload_bounds",
    phase: "intake",
    label: "Payload bounds",
    lookingFor: "Answer, explanation, hints, and layers stay within safe size limits.",
    severity: "block",
    spend: "none",
  },
  {
    id: "family_friendly",
    phase: "safety",
    label: "Family-friendly language",
    lookingFor: "No sexual, violent, hateful, or slur content in answer/hints/explanation.",
    severity: "block",
    spend: "none",
  },
  {
    id: "no_pii",
    phase: "safety",
    label: "No personal data",
    lookingFor: "No emails, phone numbers, or obvious identity strings on the board copy.",
    severity: "block",
    spend: "none",
  },
  {
    id: "no_injection",
    phase: "safety",
    label: "No prompt injection",
    lookingFor: "Text does not try to override Eve instructions or system prompts.",
    severity: "block",
    spend: "none",
  },
  {
    id: "no_external_lure",
    phase: "safety",
    label: "No external lures",
    lookingFor: "No URLs, QR-style bait, or “click here” phishing patterns.",
    severity: "block",
    spend: "none",
  },
  {
    id: "answer_not_on_board",
    phase: "structure",
    label: "Answer hidden in the visual",
    lookingFor: "The solution is not spelled out in board text or unicode fallback.",
    severity: "block",
    spend: "none",
  },
  {
    id: "catalog_only_visuals",
    phase: "structure",
    label: "Catalog pictograms only",
    lookingFor: "Boards use authenticated catalog icons — no custom image uploads yet.",
    severity: "block",
    spend: "none",
  },
  {
    id: "part_budget",
    phase: "structure",
    label: "Readable part budget",
    lookingFor: "1–6 visual parts so the rebus stays glanceable.",
    severity: "block",
    spend: "none",
  },
  {
    id: "technique_fit",
    phase: "structure",
    label: "Technique fits difficulty",
    lookingFor: "Chosen rebus technique is known and allowed for the target difficulty.",
    severity: "block",
    spend: "none",
  },
  {
    id: "hint_ladder",
    phase: "quality",
    label: "Progressive hint ladder",
    lookingFor: "Three hints that escalate without spoiling the answer too early.",
    severity: "block",
    spend: "none",
  },
  {
    id: "explanation_maps",
    phase: "quality",
    label: "Explanation maps the board",
    lookingFor: "Creator explains how icons/operators become the answer.",
    severity: "block",
    spend: "none",
  },
  {
    id: "answer_uniqueness",
    phase: "quality",
    label: "Fresh answer phrase",
    lookingFor: "Answer is not already claimed in the puzzle archive.",
    severity: "block",
    spend: "none",
  },
  {
    id: "publish_floors",
    phase: "quality",
    label: "Quality & fun floors",
    lookingFor: "Quality ≥ 70 and fun ≥ 60 — same Studio floors as deterministic grade.",
    severity: "block",
    spend: "none",
  },
  {
    id: "semantic_alignment",
    phase: "quality",
    label: "Semantic alignment",
    lookingFor: "Board, technique, and answer agree on the intended reading.",
    severity: "block",
    spend: "none",
  },
  {
    id: "adversarial_critique",
    phase: "critique",
    label: "Adversarial Eve critique",
    lookingFor: "Would a national daily editor ship this? Aha, fairness, craft.",
    severity: "block",
    spend: "llm",
  },
  {
    id: "icon_recognizability",
    phase: "critique",
    label: "Icon recognizability",
    lookingFor: "Pictogram nouns a stranger can sketch — not vague blobs.",
    severity: "block",
    spend: "llm",
  },
  {
    id: "trope_freshness",
    phase: "critique",
    label: "Trope freshness",
    lookingFor: "Classic rebus clichés need a genuine twist, or Eve flags them.",
    severity: "warn",
    spend: "llm",
  },
  {
    id: "player_fairness",
    phase: "player_sim",
    label: "Blind / hinted fairness",
    lookingFor: "Optional vision tournament — unfair boards are blocked when enabled.",
    severity: "block",
    spend: "vision",
  },
  {
    id: "final_verdict",
    phase: "verdict",
    label: "Publish verdict",
    lookingFor: "Ship only when every blocking check passes.",
    severity: "block",
    spend: "none",
  },
];

export function checksForPhase(phase: ReviewPhaseId): ReviewCheckDef[] {
  return EVE_REVIEW_CHECKS.filter((check) => check.phase === phase);
}
