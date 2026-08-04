/**
 * Extensive Eve Studio review — phased checklist with status, thinking, answers.
 * Deterministic gates first; LLM critique and optional vision player-sim behind flags.
 */

import { AI_CONFIG } from "@/ai/config";
import { critiqueCandidate } from "@/ai/puzzle-agent/apex/critique";
import {
  playerSimPublishBlockers,
  simulatePlayerSolve,
} from "@/ai/puzzle-agent/apex/player-sim";
import type { CritiqueResult } from "@/ai/puzzle-agent/apex/types";
import { tierLabelForScore } from "@/ai/puzzle-agent/quality";
import { evaluateSemanticAlignment } from "@/ai/puzzle-agent/semantic-alignment";
import type { PuzzleVisual } from "@/ai/puzzle-agent/visual/composition";
import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import {
  partitionSafetyFindings,
  scanStudioContentSafety,
  validateStudioPayloadBounds,
  type SafetyFinding,
} from "./content-safety";
import {
  EVE_REVIEW_CHECKS,
  EVE_REVIEW_PHASES,
  type ReviewCheckId,
  type ReviewPhaseId,
} from "./eve-review-manifest";
import { gradeUserPuzzleSubmission, type GradeSubmissionResult } from "./grade-submission";

export type CheckRunStatus = "pending" | "running" | "pass" | "fail" | "warn" | "skip";
export type PhaseRunStatus = "pending" | "running" | "done";
export type ReviewVerdict = "ship" | "revise" | "reject";

export type EveReviewInput = {
  title?: string;
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  visual: {
    layout?: PuzzleVisual["layout"];
    layers: PuzzleVisual["layers"];
    caption?: string;
  };
  /** When true, attempt vision player-sim if env allows */
  deepReview?: boolean;
};

export type EveReviewCheckResult = {
  id: ReviewCheckId;
  status: CheckRunStatus;
  detail?: string;
  thinking?: string;
};

export type EveReviewResult = {
  reviewId: string;
  ok: boolean;
  verdict: ReviewVerdict;
  summary: string;
  blockers: string[];
  warnings: string[];
  checks: EveReviewCheckResult[];
  grade: Pick<GradeSubmissionResult, "ok" | "score" | "funScore" | "issues" | "visual" | "rebusPuzzle" | "answerKey">;
  critique?: {
    verdict: CritiqueResult["verdict"];
    source: CritiqueResult["source"];
    summary: string;
    strengths: string[];
    flaws: string[];
    reviseInstructions: string[];
    creativityScore: number;
    iconRecognizability: number;
    overusedTrope: boolean;
  };
  spend: {
    critique: "ran" | "skipped" | "failed";
    playerSim: "ran" | "skipped" | "failed";
  };
  checkedAt: string;
};

export type EveReviewEvent =
  | {
      type: "manifest";
      reviewId: string;
      phases: typeof EVE_REVIEW_PHASES;
      checks: typeof EVE_REVIEW_CHECKS;
    }
  | {
      type: "phase";
      phaseId: ReviewPhaseId;
      status: PhaseRunStatus;
      label: string;
    }
  | {
      type: "thinking";
      phaseId: ReviewPhaseId;
      text: string;
    }
  | {
      type: "check";
      checkId: ReviewCheckId;
      status: CheckRunStatus;
      detail?: string;
      thinking?: string;
    }
  | {
      type: "answer";
      phaseId: ReviewPhaseId;
      summary: string;
      data?: Record<string, string | number | boolean | null>;
    }
  | {
      type: "done";
      result: EveReviewResult;
    };

type Emit = (event: EveReviewEvent) => void | Promise<void>;

function studioPlayerSimEnabled(deepReview: boolean): boolean {
  if (!deepReview && process.env.STUDIO_EVE_PLAYER_SIM !== "1") return false;
  if (!AI_CONFIG.puzzleAgent.apex.playerSimEnabled) return false;
  if (!AI_CONFIG.visualRecognition.boardEnabled) return false;
  if (process.env.STUDIO_EVE_PLAYER_SIM === "0") return false;
  return deepReview || process.env.STUDIO_EVE_PLAYER_SIM === "1";
}

function studioCritiqueEnabled(): boolean {
  return AI_CONFIG.puzzleAgent.apex.enabled && AI_CONFIG.puzzleAgent.apex.critiqueEnabled;
}

async function emitSafe(emit: Emit | undefined, event: EveReviewEvent): Promise<void> {
  if (!emit) return;
  await emit(event);
}

function findingsDetail(findings: SafetyFinding[]): string | undefined {
  if (!findings.length) return undefined;
  return findings.map((f) => f.message).join("; ");
}

function collectBlockers(checks: EveReviewCheckResult[]): string[] {
  return checks
    .filter((c) => c.status === "fail")
    .map((c) => c.detail || c.id)
    .filter(Boolean);
}

function collectWarnings(checks: EveReviewCheckResult[]): string[] {
  return checks
    .filter((c) => c.status === "warn")
    .map((c) => c.detail || c.id)
    .filter(Boolean);
}

function decideVerdict(blockers: string[], critiqueVerdict?: ReviewVerdict): ReviewVerdict {
  if (blockers.length === 0) return "ship";
  if (
    blockers.some((b) =>
      /family-friendly|personal data|phone|email|lure|injection|unsafe|PII/i.test(b)
    )
  ) {
    return "reject";
  }
  if (critiqueVerdict === "reject") return "reject";
  return "revise";
}

export async function runEveStudioReview(
  input: EveReviewInput,
  options?: { emit?: Emit }
): Promise<EveReviewResult> {
  const emit = options?.emit;
  const reviewId = crypto.randomUUID();
  const checkedAt = new Date().toISOString();
  const checks = new Map<ReviewCheckId, EveReviewCheckResult>();

  const setCheck = async (
    id: ReviewCheckId,
    status: CheckRunStatus,
    detail?: string,
    thinking?: string
  ) => {
    const row: EveReviewCheckResult = { id, status, detail, thinking };
    checks.set(id, row);
    await emitSafe(emit, { type: "check", checkId: id, status, detail, thinking });
  };

  const startPhase = async (phaseId: ReviewPhaseId) => {
    const phase = EVE_REVIEW_PHASES.find((p) => p.id === phaseId)!;
    await emitSafe(emit, {
      type: "phase",
      phaseId,
      status: "running",
      label: phase.label,
    });
  };

  const endPhase = async (phaseId: ReviewPhaseId) => {
    const phase = EVE_REVIEW_PHASES.find((p) => p.id === phaseId)!;
    await emitSafe(emit, {
      type: "phase",
      phaseId,
      status: "done",
      label: phase.label,
    });
  };

  const think = async (phaseId: ReviewPhaseId, text: string) => {
    await emitSafe(emit, { type: "thinking", phaseId, text });
  };

  const answer = async (
    phaseId: ReviewPhaseId,
    summary: string,
    data?: Record<string, string | number | boolean | null>
  ) => {
    await emitSafe(emit, { type: "answer", phaseId, summary, data });
  };

  await emitSafe(emit, {
    type: "manifest",
    reviewId,
    phases: EVE_REVIEW_PHASES,
    checks: EVE_REVIEW_CHECKS,
  });

  // ── Intake ──────────────────────────────────────────────────────────────
  await startPhase("intake");
  await think("intake", "Confirming author session already gated the API; sizing the draft payload.");
  await setCheck(
    "auth_surface",
    "pass",
    "Review runs only for the authenticated Studio author on this request."
  );

  const boundFindings = validateStudioPayloadBounds({
    title: input.title,
    answer: input.answer,
    explanation: input.explanation,
    hints: input.hints,
    layersLength: input.visual.layers.length,
  });
  await setCheck(
    "payload_bounds",
    boundFindings.length ? "fail" : "pass",
    findingsDetail(boundFindings) ?? "Answer, explanation, hints, and layers are within bounds.",
    "Hard size caps protect Mongo docs and model prompts from abuse."
  );
  await answer(
    "intake",
    boundFindings.length ? "Payload needs trimming before deeper checks." : "Draft size looks safe.",
    {
      layers: input.visual.layers.length,
      hints: input.hints.filter(Boolean).length,
      answerChars: input.answer.trim().length,
    }
  );
  await endPhase("intake");

  // ── Safety ──────────────────────────────────────────────────────────────
  await startPhase("safety");
  await think(
    "safety",
    "Scanning answer, hints, explanation, and board text for PII, lures, injection, and unsafe language — before any model spend."
  );

  const safetyFindings = scanStudioContentSafety({
    title: input.title,
    answer: input.answer,
    explanation: input.explanation,
    hints: input.hints,
  });
  const parts = partitionSafetyFindings(safetyFindings);

  await setCheck(
    "family_friendly",
    parts.familyFriendly.length ? "fail" : "pass",
    findingsDetail(parts.familyFriendly) ?? "Language looks family-friendly.",
    "National daily bar: no sexual, violent, or hateful copy."
  );
  await setCheck(
    "no_pii",
    parts.pii.length ? "fail" : "pass",
    findingsDetail(parts.pii) ?? "No email/phone patterns detected.",
    "Creators must not publish personal contact data on boards."
  );
  await setCheck(
    "no_injection",
    parts.injection.length ? "fail" : "pass",
    findingsDetail(parts.injection) ?? "No instruction-override patterns.",
    "Blocks attempts to rewrite Eve’s system instructions via puzzle text."
  );
  await setCheck(
    "no_external_lure",
    parts.lure.length ? "fail" : "pass",
    findingsDetail(parts.lure) ?? "No URLs or lure phrases.",
    "Community boards must not phish or send players off-site."
  );

  const safetyBlocked = safetyFindings.length > 0 || boundFindings.length > 0;
  await answer(
    "safety",
    safetyBlocked
      ? "Safety blockers found — stopping before AI spend."
      : "Safety clear. Continuing to structure and quality.",
    { findings: safetyFindings.length }
  );
  await endPhase("safety");

  let grade: GradeSubmissionResult | null = null;
  let critiquePayload: EveReviewResult["critique"];
  let spend: EveReviewResult["spend"] = { critique: "skipped", playerSim: "skipped" };

  if (safetyBlocked) {
    for (const id of [
      "answer_not_on_board",
      "catalog_only_visuals",
      "part_budget",
      "technique_fit",
      "hint_ladder",
      "explanation_maps",
      "answer_uniqueness",
      "publish_floors",
      "semantic_alignment",
      "adversarial_critique",
      "icon_recognizability",
      "trope_freshness",
      "player_fairness",
    ] as ReviewCheckId[]) {
      if (!checks.has(id)) {
        await setCheck(id, "skip", "Skipped — fix safety / intake blockers first.");
      }
    }
  } else {
    // ── Structure + quality via deterministic grade ───────────────────────
    await startPhase("structure");
    await think(
      "structure",
      "Hydrating catalog pictograms and running the same visual authenticity / leak / technique floors used on invent (without Apex invent spend)."
    );

    grade = await gradeUserPuzzleSubmission({
      answer: input.answer,
      explanation: input.explanation,
      hints: input.hints,
      techniqueId: input.techniqueId,
      difficulty: input.difficulty,
      visual: input.visual,
    });

    const issueBlob = grade.issues.join(" | ");
    const has = (re: RegExp) => grade!.issues.some((i) => re.test(i));

    await setCheck(
      "answer_not_on_board",
      has(/visible in the board|leaked/i) ? "fail" : "pass",
      has(/visible in the board|leaked/i)
        ? grade.issues.find((i) => /visible|leak/i.test(i))
        : "Answer is not spelled out on the board.",
      "Players should discover the phrase — not read it off the tiles."
    );
    const catalogIssue = grade.issues.find((i) =>
      /Custom image|authentic|Unknown pictogram|unrecognized|catalog/i.test(i)
    );
    await setCheck(
      "catalog_only_visuals",
      catalogIssue ? "fail" : "pass",
      catalogIssue ?? "Board uses catalog pictograms / text / operators only.",
      "Studio only ships authenticated catalog SVG tiles."
    );
    await setCheck(
      "part_budget",
      has(/Too many cues|at least one pictogram/i) ? "fail" : "pass",
      has(/Too many cues|at least one pictogram/i)
        ? grade.issues.find((i) => /cues|pictogram or text/i.test(i))
        : "Part count is within the readable 1–6 budget."
    );
    await setCheck(
      "technique_fit",
      has(/technique|Technique/i) ? "fail" : "pass",
      has(/technique|Technique/i)
        ? grade.issues.find((i) => /technique/i.test(i))
        : `Technique ${input.techniqueId} fits difficulty ${input.difficulty}.`
    );
    await answer(
      "structure",
      grade.ok
        ? "Structure looks publishable so far."
        : "Structure has issues — see checks.",
      { rebus: grade.rebusPuzzle, partsIssue: has(/cues|pictogram/i) }
    );
    await endPhase("structure");

    await startPhase("quality");
    await think(
      "quality",
      "Checking hint ladder, explanation mapping, archive uniqueness, and Studio quality/fun floors."
    );

    await setCheck(
      "hint_ladder",
      has(/hint/i) ? "fail" : "pass",
      has(/hint/i)
        ? grade.issues.filter((i) => /hint/i.test(i)).join("; ") || "Hint ladder failed"
        : "Three progressive hints without early answer leak."
    );
    await setCheck(
      "explanation_maps",
      has(/Explanation/i) ? "fail" : "pass",
      has(/Explanation/i)
        ? grade.issues.find((i) => /Explanation/i.test(i))
        : "Explanation maps the board to the answer."
    );
    await setCheck(
      "answer_uniqueness",
      has(/already in the puzzle archive|uniqueness/i) ? "fail" : "pass",
      has(/already in the puzzle archive|uniqueness/i)
        ? grade.issues.find((i) => /archive|uniqueness/i.test(i))
        : "Answer phrase is free in the archive."
    );
    await setCheck(
      "publish_floors",
      has(/Quality score|Fun score/i) ? "fail" : grade.ok ? "pass" : has(/score/i) ? "fail" : "pass",
      `Quality ${grade.score}/100 · fun ${grade.funScore}/100` +
        (has(/Quality score|Fun score/i)
          ? ` — ${grade.issues.filter((i) => /score/i.test(i)).join("; ")}`
          : " meets Studio floors.")
    );

    const semantic = evaluateSemanticAlignment({
      answer: input.answer,
      techniqueId: input.techniqueId,
      explanation: input.explanation,
      visual: grade.visual,
    });
    await setCheck(
      "semantic_alignment",
      semantic.ok ? "pass" : "fail",
      semantic.ok
        ? "Board, technique, and answer agree on one reading."
        : `${semantic.rule}: ${semantic.blockers.join("; ")}`,
      "Catches boards that don’t actually encode the claimed answer."
    );

    await answer(
      "quality",
      grade.ok && semantic.ok
        ? "Deterministic quality floors cleared."
        : `Quality gate: ${!grade.ok ? issueBlob || "grade failed" : "semantic alignment"}`,
      {
        score: grade.score,
        funScore: grade.funScore,
        gradeOk: grade.ok,
        semanticOk: semantic.ok,
      }
    );
    await endPhase("quality");

    // Studio skips invent's catalog-recognition evidence requirement; grade already
    // applied evaluateVisualForPublish({ requireCatalogRecognitionEvidence: false }).
    const deterministicOk = grade.ok && semantic.ok;

    // ── Critique ──────────────────────────────────────────────────────────
    await startPhase("critique");
    if (!studioCritiqueEnabled()) {
      await think("critique", "Eve critique disabled via EVE_APEX_CRITIQUE / EVE_APEX_ENGINE — skipping spend.");
      await setCheck("adversarial_critique", "skip", "Critique spend disabled in this environment.");
      await setCheck("icon_recognizability", "skip", "Skipped with critique.");
      await setCheck("trope_freshness", "skip", "Skipped with critique.");
      spend.critique = "skipped";
      await answer("critique", "Critique skipped by environment flags.", { enabled: false });
    } else if (!deterministicOk) {
      await think(
        "critique",
        "Holding critique spend — deterministic blockers must be fixed first (environment + cost safety)."
      );
      await setCheck(
        "adversarial_critique",
        "skip",
        "Skipped until quality floors pass — saves model spend."
      );
      await setCheck("icon_recognizability", "skip", "Skipped until quality floors pass.");
      await setCheck("trope_freshness", "skip", "Skipped until quality floors pass.");
      spend.critique = "skipped";
      await answer("critique", "Critique deferred until deterministic issues clear.");
    } else {
      await think(
        "critique",
        "Asking Eve’s adversarial editor: would we be proud to publish this nationally?"
      );
      const concepts = grade.visual.layers
        .filter((l): l is Extract<PuzzleVisual["layers"][number], { kind: "pictogram" }> => l.kind === "pictogram")
        .map((l) => l.concept);

      const critique = await critiqueCandidate({
        rebusPuzzle: grade.rebusPuzzle,
        answer: input.answer,
        explanation: input.explanation,
        hints: input.hints.filter(Boolean),
        techniqueId: input.techniqueId,
        difficulty: input.difficulty,
        tierLabel: tierLabelForScore(input.difficulty),
        unicodeFallback: grade.rebusPuzzle,
        pictogramConcepts: concepts,
      });

      critiquePayload = {
        verdict: critique.verdict,
        source: critique.source,
        summary: critique.summary,
        strengths: critique.strengths,
        flaws: critique.flaws,
        reviseInstructions: critique.reviseInstructions,
        creativityScore: critique.creativityScore ?? 55,
        iconRecognizability: critique.iconRecognizability ?? 55,
        overusedTrope: critique.overusedTrope ?? false,
      };
      spend.critique = critique.source === "fallback" ? "failed" : "ran";

      if (critique.source === "fallback") {
        await setCheck(
          "adversarial_critique",
          "warn",
          "Critique model unavailable — relying on deterministic gates (soft warn).",
          "Fail-open on infra blips so creators aren’t blocked by outages; still warn."
        );
        await setCheck(
          "icon_recognizability",
          "warn",
          "Icon score unavailable from critique fallback."
        );
        await setCheck(
          "trope_freshness",
          "warn",
          "Trope check unavailable from critique fallback."
        );
      } else {
        const critiqueBlocks =
          critique.verdict === "reject" ||
          critique.verdict === "revise" ||
          (critique.creativityScore ?? 0) < 62 ||
          (critique.iconRecognizability ?? 0) < 62;
        await setCheck(
          "adversarial_critique",
          critiqueBlocks ? "fail" : "pass",
          critiqueBlocks
            ? `${critique.verdict}: ${critique.summary}`
            : `Ship-ready critique — ${critique.summary}`,
          critique.reviseInstructions.slice(0, 3).join(" · ") || critique.flaws.slice(0, 2).join(" · ")
        );
        await setCheck(
          "icon_recognizability",
          (critique.iconRecognizability ?? 0) < 62 ? "fail" : "pass",
          `Icon recognizability ${critique.iconRecognizability ?? 0}/100 (floor 62).`
        );
        await setCheck(
          "trope_freshness",
          critique.overusedTrope ? "warn" : "pass",
          critique.overusedTrope
            ? "Classic rebus trope — add a fresher twist before lottery feature."
            : "Mechanism does not look like a stale trope."
        );
      }

      await answer(
        "critique",
        critique.summary,
        {
          verdict: critique.verdict,
          source: critique.source ?? "model",
          creativity: critique.creativityScore ?? 0,
          icons: critique.iconRecognizability ?? 0,
          trope: Boolean(critique.overusedTrope),
        }
      );
    }
    await endPhase("critique");

    // ── Player sim (optional vision) ──────────────────────────────────────
    await startPhase("player_sim");
    const deep = Boolean(input.deepReview) || process.env.STUDIO_EVE_PLAYER_SIM === "1";
    if (!studioPlayerSimEnabled(deep)) {
      await think(
        "player_sim",
        "Vision player-sim is opt-in (STUDIO_EVE_PLAYER_SIM=1 + board vision). Skipping to keep Studio spend safe."
      );
      await setCheck(
        "player_fairness",
        "skip",
        "Deep player simulation skipped — enable STUDIO_EVE_PLAYER_SIM for vision fairness."
      );
      spend.playerSim = "skipped";
      await answer("player_sim", "Player simulation not run (spend gate).");
    } else if (!deterministicOk || !grade) {
      await setCheck("player_fairness", "skip", "Skipped — deterministic quality must pass first.");
      spend.playerSim = "skipped";
      await answer("player_sim", "Player simulation deferred.");
    } else {
      await think(
        "player_sim",
        "Running blind / editorial screenshot tournament — expensive; only when deep review is on."
      );
      try {
        const sim = await simulatePlayerSolve({
          rebusPuzzle: grade.rebusPuzzle,
          answer: input.answer,
          explanation: input.explanation,
          hints: input.hints.filter(Boolean),
          techniqueId: input.techniqueId,
          tierLabel: tierLabelForScore(input.difficulty),
          visual: grade.visual,
        });
        const blockers = playerSimPublishBlockers(sim);
        spend.playerSim = "ran";
        await setCheck(
          "player_fairness",
          blockers.length ? "fail" : "pass",
          blockers.length
            ? blockers.slice(0, 4).join("; ")
            : `Fair enough — estimated solve rate ${(sim.estimatedSolveRate * 100).toFixed(0)}%.`,
          sim.likelySolvePath
        );
        await answer("player_sim", blockers.length ? "Player sim found fairness issues." : "Player sim looks fair.", {
          estimatedSolveRate: sim.estimatedSolveRate,
          confidence: sim.confidence,
          blockers: blockers.length,
        });
      } catch {
        spend.playerSim = "failed";
        await setCheck(
          "player_fairness",
          "warn",
          "Player simulation failed — not blocking solely on infra error.",
          "Vision stack blip; deterministic + critique still apply."
        );
        await answer("player_sim", "Player simulation unavailable.");
      }
    }
    await endPhase("player_sim");
  }

  // ── Verdict ─────────────────────────────────────────────────────────────
  await startPhase("verdict");
  await think("verdict", "Aggregating every blocking check into a ship / revise / reject decision.");

  if (!grade) {
    // Minimal grade shell when safety short-circuits
    grade = {
      ok: false,
      visual: {
        styleId: INK_PICTOGRAM_STYLE_ID,
        mode: "composed",
        layout: input.visual.layout ?? "row",
        layers: input.visual.layers,
        unicodeFallback: "◆",
      },
      rebusPuzzle: "◆",
      answerKey: "",
      score: 0,
      funScore: 0,
      issues: [
        ...boundFindings.map((f) => f.message),
        ...safetyFindings.map((f) => f.message),
      ],
    };
  }

  const checkList = EVE_REVIEW_CHECKS.map(
    (def) => checks.get(def.id) ?? { id: def.id, status: "pending" as const }
  );
  const blockers = collectBlockers(checkList);
  const warnings = collectWarnings(checkList);
  const critiqueVerdict = critiquePayload?.verdict;
  const verdict = decideVerdict(blockers, critiqueVerdict);
  const ok = verdict === "ship" && blockers.length === 0;

  await setCheck(
    "final_verdict",
    ok ? "pass" : "fail",
    ok
      ? "Eve would ship this — publish when you’re ready."
      : `${verdict}: ${blockers.slice(0, 3).join(" · ") || "See checklist"}`,
    ok
      ? "All blocking checks passed."
      : "Fix blockers, re-run Eve review, then publish."
  );

  const summary = ok
    ? "Eve review passed — quality and safety checks cleared."
    : verdict === "reject"
      ? "Eve rejected this draft — safety or hard quality failures."
      : "Eve asks for a revise — address the blockers and run review again.";

  await answer("verdict", summary, {
    verdict,
    ok,
    blockers: blockers.length,
    warnings: warnings.length,
  });
  await endPhase("verdict");

  const result: EveReviewResult = {
    reviewId,
    ok,
    verdict,
    summary,
    blockers,
    warnings,
    checks: checkList,
    grade: {
      ok: grade.ok,
      score: grade.score,
      funScore: grade.funScore,
      issues: grade.issues,
      visual: grade.visual,
      rebusPuzzle: grade.rebusPuzzle,
      answerKey: grade.answerKey,
    },
    critique: critiquePayload,
    spend,
    checkedAt,
  };

  await emitSafe(emit, { type: "done", result });
  return result;
}

/** Public JSON shape safe to return to the author (never other users’ secrets). */
export function publicEveReview(result: EveReviewResult) {
  return {
    reviewId: result.reviewId,
    ok: result.ok,
    verdict: result.verdict,
    summary: result.summary,
    blockers: result.blockers,
    warnings: result.warnings,
    checks: result.checks,
    grade: {
      ok: result.grade.ok,
      score: result.grade.score,
      funScore: result.grade.funScore,
      issues: result.grade.issues,
    },
    critique: result.critique
      ? {
          verdict: result.critique.verdict,
          source: result.critique.source,
          summary: result.critique.summary,
          strengths: result.critique.strengths,
          flaws: result.critique.flaws,
          reviseInstructions: result.critique.reviseInstructions,
          creativityScore: result.critique.creativityScore,
          iconRecognizability: result.critique.iconRecognizability,
          overusedTrope: result.critique.overusedTrope,
        }
      : undefined,
    spend: result.spend,
    checkedAt: result.checkedAt,
    lookingFor: EVE_REVIEW_CHECKS.map((c) => ({
      id: c.id,
      phase: c.phase,
      label: c.label,
      lookingFor: c.lookingFor,
      severity: c.severity,
      spend: c.spend,
    })),
    phases: EVE_REVIEW_PHASES,
  };
}
