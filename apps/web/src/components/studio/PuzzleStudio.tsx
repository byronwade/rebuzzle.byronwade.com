"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import { defaultPositionForIndex, snapPosition } from "@/ai/puzzle-agent/visual/layer-position";
import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { PageHeader } from "@/components/PageHeader";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import {
  type EveReviewLiveState,
  EveReviewPanel,
  emptyEveReviewState,
  type LiveCheckStatus,
} from "@/components/studio/EveReviewPanel";
import { StudioArtboard } from "@/components/studio/StudioArtboard";
import { Button } from "@/components/ui/button";
import { labelFromSlug } from "@/lib/typography";
import { EVE_REVIEW_CHECKS, EVE_REVIEW_PHASES } from "@/lib/ugc/eve-review-manifest";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import { STUDIO_AI_GENERATION_LIMIT, type StudioMark } from "@/lib/ugc/studio-marks";
import {
  humanizeGradeIssue,
  STUDIO_TEMPLATES,
  type StudioTemplate,
} from "@/lib/ugc/studio-templates";
import { cn } from "@/lib/utils";

type CatalogPictogram = { id: string; concept: string; svg: string };
type TechniqueOption = { id: string; name: string; summary: string };
type AiQuota = { used: number; limit: number; remaining: number };

type GradeSnapshot = {
  ok: boolean;
  score: number;
  funScore: number;
  issues: string[];
};

type StudioEveReviewSnapshot = {
  reviewId: string;
  ok: boolean;
  verdict: "ship" | "revise" | "reject";
  summary: string;
  blockers: string[];
  warnings: string[];
  checkedAt: string;
};

type StudioSubmission = {
  id: string;
  slug: string;
  status: string;
  title?: string;
  answer: string;
  explanation?: string;
  hints?: string[];
  techniqueId: string;
  difficulty: number;
  rebusPuzzle: string;
  visual: PuzzleVisual;
  grade?: GradeSnapshot & { gradedAt?: string };
  eveReview?: StudioEveReviewSnapshot;
  puzzleId?: string;
  featuredOn?: string;
};

function studioContentFingerprint(input: {
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  layout: PuzzleVisual["layout"];
  layers: VisualLayer[];
}) {
  return JSON.stringify({
    answer: input.answer.trim(),
    explanation: input.explanation.trim(),
    hints: input.hints.map((h) => h.trim()),
    techniqueId: input.techniqueId,
    difficulty: input.difficulty,
    layout: input.layout,
    layers: input.layers,
  });
}

function hydrateEveReviewFromSnapshot(
  snapshot?: StudioEveReviewSnapshot | null
): EveReviewLiveState {
  const base = emptyEveReviewState(
    EVE_REVIEW_PHASES,
    EVE_REVIEW_CHECKS.map((c) => ({
      id: c.id,
      label: c.label,
      lookingFor: c.lookingFor,
      phase: c.phase,
      severity: c.severity,
      spend: c.spend,
    }))
  );
  if (!snapshot) return base;
  return {
    ...base,
    reviewId: snapshot.reviewId,
    running: false,
    verdict: snapshot.verdict,
    summary: snapshot.summary,
    blockers: snapshot.blockers,
    warnings: snapshot.warnings,
  };
}

type StepId = "board" | "details" | "publish";

const STEPS: Array<{ id: StepId; label: string; hint: string }> = [
  { id: "board", label: "1 · Board", hint: "Place pieces" },
  { id: "details", label: "2 · Answer", hint: "Explain it" },
  { id: "publish", label: "3 · Publish", hint: "Eve checks" },
];

function layerLabel(layer: VisualLayer): string {
  if (layer.kind === "pictogram") return layer.concept;
  if (layer.kind === "text") return layer.content;
  if (layer.kind === "operator") return layer.symbol;
  return layer.concept || layer.alt || "image";
}

function buildPreview(layout: PuzzleVisual["layout"], layers: VisualLayer[]): PuzzleVisual {
  return {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed",
    layout,
    layers,
    unicodeFallback:
      layers
        .map((layer) => {
          if (layer.kind === "pictogram") return layer.emojiFallback || "◆";
          if (layer.kind === "text") return layer.content;
          if (layer.kind === "operator") return layer.symbol;
          return "◆";
        })
        .join(" ")
        .trim() || "◆",
  };
}

function withDefaultPosition(layer: VisualLayer, index: number): VisualLayer {
  if (typeof layer.x === "number" && typeof layer.y === "number") return layer;
  const pos = defaultPositionForIndex(index);
  return { ...layer, ...pos };
}

function appendLayer(prev: VisualLayer[], next: VisualLayer): VisualLayer[] {
  return [...prev, withDefaultPosition(next, prev.length)];
}

function applyReviewEvent(
  prev: EveReviewLiveState,
  event: Record<string, unknown>
): EveReviewLiveState {
  const type = event.type;
  if (type === "manifest") {
    const phases = Array.isArray(event.phases)
      ? (event.phases as Array<{ id: string; label: string; summary: string }>).map((p) => ({
          ...p,
          status: "pending" as const,
        }))
      : prev.phases;
    const checks = Array.isArray(event.checks)
      ? (
          event.checks as Array<{
            id: string;
            label: string;
            lookingFor: string;
            phase: string;
            severity?: string;
            spend?: string;
          }>
        ).map((c) => ({
          ...c,
          status: "pending" as const,
        }))
      : prev.checks;
    return {
      ...prev,
      reviewId: typeof event.reviewId === "string" ? event.reviewId : prev.reviewId,
      phases,
      checks,
      running: true,
      thinking: [],
      answers: [],
      blockers: [],
      warnings: [],
      verdict: undefined,
      summary: undefined,
      error: undefined,
    };
  }
  if (type === "phase") {
    const phaseId = String(event.phaseId ?? "");
    const status = event.status as "pending" | "running" | "done";
    return {
      ...prev,
      phases: prev.phases.map((p) => (p.id === phaseId ? { ...p, status } : p)),
    };
  }
  if (type === "thinking") {
    return {
      ...prev,
      thinking: [
        ...prev.thinking,
        { phaseId: String(event.phaseId ?? ""), text: String(event.text ?? "") },
      ].slice(-24),
    };
  }
  if (type === "check") {
    const checkId = String(event.checkId ?? "");
    const status = event.status as LiveCheckStatus;
    return {
      ...prev,
      checks: prev.checks.map((c) =>
        c.id === checkId
          ? {
              ...c,
              status,
              detail: typeof event.detail === "string" ? event.detail : c.detail,
              thinking: typeof event.thinking === "string" ? event.thinking : c.thinking,
            }
          : c
      ),
    };
  }
  if (type === "answer") {
    return {
      ...prev,
      answers: [
        ...prev.answers,
        {
          phaseId: String(event.phaseId ?? ""),
          summary: String(event.summary ?? ""),
          data: event.data as Record<string, string | number | boolean | null> | undefined,
        },
      ].slice(-16),
    };
  }
  if (type === "done") {
    const review = event.review as
      | {
          ok?: boolean;
          verdict?: "ship" | "revise" | "reject";
          summary?: string;
          blockers?: string[];
          warnings?: string[];
          checks?: Array<{
            id: string;
            status: LiveCheckStatus;
            detail?: string;
            thinking?: string;
          }>;
        }
      | undefined;
    return {
      ...prev,
      running: false,
      verdict: review?.verdict,
      summary: review?.summary,
      blockers: review?.blockers ?? [],
      warnings: review?.warnings ?? [],
      checks: review?.checks
        ? prev.checks.map((check) => {
            const match = review.checks?.find((c) => c.id === check.id);
            return match
              ? {
                  ...check,
                  status: match.status,
                  detail: match.detail,
                  thinking: match.thinking,
                }
              : check;
          })
        : prev.checks,
    };
  }
  if (type === "persisted") {
    return {
      ...prev,
      reviewId: typeof event.submissionId === "string" ? prev.reviewId : prev.reviewId,
    };
  }
  if (type === "error") {
    return {
      ...prev,
      running: false,
      error: String(event.error ?? "Eve review failed"),
    };
  }
  return prev;
}

const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_grade: "In review",
  approved: "Published",
  featured: "Featured",
  rejected: "Not published",
};

function submissionStatusLabel(status: string) {
  return SUBMISSION_STATUS_LABELS[status] ?? labelFromSlug(status);
}

const MIN_ANSWER_LENGTH = 2;
const MIN_EXPLANATION_LENGTH = 24;

export function PuzzleStudio() {
  const { isAuthenticated, isGuest, isLoading, user } = useAuth();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<StepId>("board");
  const [pictograms, setPictograms] = useState<CatalogPictogram[]>([]);
  const [techniques, setTechniques] = useState<TechniqueOption[]>([]);
  const [submissions, setSubmissions] = useState<StudioSubmission[]>([]);
  const [draftId, setDraftId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [answer, setAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [hints, setHints] = useState(["", "", ""]);
  const [techniqueId, setTechniqueId] = useState("simple_compound");
  const [difficulty, setDifficulty] = useState(5);
  const [layout, setLayout] = useState<PuzzleVisual["layout"]>("free");
  const [layers, setLayers] = useState<VisualLayer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogTab, setCatalogTab] = useState<"icons" | "marks" | "ai">("icons");
  const [marks, setMarks] = useState<StudioMark[]>([]);
  const [aiQuota, setAiQuota] = useState<AiQuota>({
    used: 0,
    limit: STUDIO_AI_GENERATION_LIMIT,
    remaining: STUDIO_AI_GENERATION_LIMIT,
  });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [grade, setGrade] = useState<GradeSnapshot | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  /** Confirms a palette tap, since on phones the board sits above the palette, out of view. */
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [deepReview, setDeepReview] = useState(false);
  const [shipFingerprint, setShipFingerprint] = useState<string | null>(null);
  const [eveReview, setEveReview] = useState<EveReviewLiveState>(() =>
    hydrateEveReviewFromSnapshot(null)
  );

  const preview = useMemo(() => buildPreview(layout, layers), [layout, layers]);
  const selected = layers[selectedIndex];
  const canDetails = layers.some(
    (l) => l.kind === "pictogram" || l.kind === "text" || l.kind === "image"
  );
  const canPublish =
    canDetails &&
    answer.trim().length >= MIN_ANSWER_LENGTH &&
    explanation.trim().length >= MIN_EXPLANATION_LENGTH;
  const explanationShortBy = Math.max(0, MIN_EXPLANATION_LENGTH - explanation.trim().length);
  /** Why "Continue to publish" is disabled, so the button never just sits there greyed out. */
  const detailsBlocker =
    answer.trim().length < MIN_ANSWER_LENGTH
      ? "Add the answer players should type."
      : explanationShortBy > 0
        ? `Explain the board in ${explanationShortBy} more ${explanationShortBy === 1 ? "character" : "characters"}.`
        : null;
  /** Coarse version for screen readers: changes per requirement, not per keystroke. */
  const detailsStatus =
    answer.trim().length < MIN_ANSWER_LENGTH
      ? "Add the answer players should type."
      : explanationShortBy > 0
        ? `The explanation needs at least ${MIN_EXPLANATION_LENGTH} characters.`
        : "Ready to continue to publish.";
  const currentFingerprint = useMemo(
    () =>
      studioContentFingerprint({
        answer,
        explanation,
        hints,
        techniqueId,
        difficulty,
        layout,
        layers,
      }),
    [answer, explanation, hints, techniqueId, difficulty, layout, layers]
  );
  const eveShipReady = eveReview.verdict === "ship" && shipFingerprint === currentFingerprint;
  const canSubmitPublish = canPublish && eveShipReady;

  useEffect(() => {
    if (!isAuthenticated || isGuest) return;
    void (async () => {
      try {
        const [catalogRes, listRes] = await Promise.all([
          fetch("/api/studio/catalog", { credentials: "include" }),
          fetch("/api/studio/submissions", { credentials: "include" }),
        ]);
        if (catalogRes.ok) {
          const data = (await catalogRes.json()) as {
            pictograms: CatalogPictogram[];
            techniques: TechniqueOption[];
            marks?: StudioMark[];
            aiQuota?: AiQuota;
          };
          setPictograms(data.pictograms);
          setTechniques(data.techniques);
          if (data.marks) setMarks(data.marks);
          if (data.aiQuota) setAiQuota(data.aiQuota);
        }
        if (listRes.ok) {
          const data = (await listRes.json()) as { submissions: StudioSubmission[] };
          setSubmissions(data.submissions);
        } else if (listRes.status === 403) {
          setError("Create a free account to use Studio.");
        }
      } catch {
        setError("Could not load Studio. Refresh and try again.");
      } finally {
        setLoaded(true);
      }
    })();
  }, [isAuthenticated, isGuest]);

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return pictograms;
    // Labels show "Alarm clock", so match the spaced form as well as the slug.
    return pictograms.filter(
      (p) =>
        p.concept.includes(q) ||
        p.id.includes(q) ||
        labelFromSlug(p.concept).toLowerCase().includes(q)
    );
  }, [catalogQuery, pictograms]);

  const filteredMarks = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return marks;
    return marks.filter((m) => m.label.toLowerCase().includes(q) || m.value.includes(q));
  }, [catalogQuery, marks]);

  function resetBoard() {
    setDraftId(undefined);
    setTitle("");
    setAnswer("");
    setExplanation("");
    setHints(["", "", ""]);
    setTechniqueId("simple_compound");
    setDifficulty(5);
    setLayout("free");
    setLayers([]);
    setSelectedIndex(0);
    setCatalogTab("icons");
    setAiPrompt("");
    setGrade(null);
    setPublishedSlug(null);
    setStatusMessage(null);
    setError(null);
    setEveReview(hydrateEveReviewFromSnapshot(null));
    setShipFingerprint(null);
    setDeepReview(false);
    setStep("board");
  }

  function reviewPayload() {
    return {
      id: draftId,
      title: title || answer,
      answer,
      explanation,
      hints,
      techniqueId,
      difficulty,
      layout,
      layers,
      deepReview,
      persist: true,
    };
  }

  async function runEveReviewStream() {
    setError(null);
    setStatusMessage(null);
    setReviewing(true);
    setEveReview((prev) => ({
      ...emptyEveReviewState(
        prev.phases.length
          ? prev.phases.map(({ id, label, summary }) => ({ id, label, summary }))
          : EVE_REVIEW_PHASES,
        prev.checks.length
          ? prev.checks.map(({ id, label, lookingFor, phase, severity, spend }) => ({
              id,
              label,
              lookingFor,
              phase,
              severity,
              spend,
            }))
          : EVE_REVIEW_CHECKS.map((c) => ({
              id: c.id,
              label: c.label,
              lookingFor: c.lookingFor,
              phase: c.phase,
              severity: c.severity,
              spend: c.spend,
            }))
      ),
      running: true,
    }));

    try {
      const response = await fetch("/api/studio/review", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewPayload()),
      });
      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Eve review failed to start");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (event.type === "persisted" && typeof event.submissionId === "string") {
            setDraftId(event.submissionId);
          }
          if (event.type === "done") {
            const review = event.review as { verdict?: string } | undefined;
            if (review?.verdict === "ship") {
              setShipFingerprint(
                studioContentFingerprint({
                  answer,
                  explanation,
                  hints,
                  techniqueId,
                  difficulty,
                  layout,
                  layers,
                })
              );
            } else {
              setShipFingerprint(null);
            }
          }
          setEveReview((prev) => applyReviewEvent(prev, event));
        }
      }
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer) as Record<string, unknown>;
          if (event.type === "persisted" && typeof event.submissionId === "string") {
            setDraftId(event.submissionId);
          }
          setEveReview((prev) => applyReviewEvent(prev, event));
        } catch {
          /* ignore trailing partial */
        }
      }
      setStatusMessage(
        "Eve finished — snapshot saved on your draft. Publish when verdict is ship."
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eve review failed";
      setError(message);
      setEveReview((prev) => ({ ...prev, running: false, error: message }));
    } finally {
      setReviewing(false);
      setEveReview((prev) => ({ ...prev, running: false }));
    }
  }

  function applyTemplate(template: StudioTemplate) {
    const nextLayers: VisualLayer[] = [];
    for (const concept of template.concepts) {
      const item = pictograms.find((p) => p.concept === concept || p.id === concept);
      if (!item) continue;
      nextLayers.push(
        withDefaultPosition(
          {
            kind: "pictogram",
            concept: item.concept,
            svg: item.svg,
            assetId: item.id,
            source: "catalog",
            emojiFallback: item.concept.slice(0, 2).toUpperCase() || "◆",
            role: "word-part",
          },
          nextLayers.length
        )
      );
    }
    for (const text of template.textLayers ?? []) {
      nextLayers.push(
        withDefaultPosition(
          {
            kind: "text",
            content: text.content,
            emphasis: text.emphasis ?? "normal",
          },
          nextLayers.length
        )
      );
    }

    setDraftId(undefined);
    setPublishedSlug(null);
    setGrade(null);
    setEveReview(hydrateEveReviewFromSnapshot(null));
    setShipFingerprint(null);
    setTitle(template.label);
    setAnswer(template.answer);
    setExplanation(template.explanation);
    setHints([...template.hints]);
    setTechniqueId(template.techniqueId);
    setDifficulty(template.difficulty);
    setLayout("free");
    setLayers(nextLayers);
    setLastAdded(null);
    setSelectedIndex(Math.max(0, nextLayers.length - 1));
    setStatusMessage(`Loaded “${template.label}” — drag pieces anywhere, then continue.`);
    setStep("board");
  }

  function addPictogram(item: CatalogPictogram) {
    setLayers((prev) => {
      const joined = appendLayer(prev, {
        kind: "pictogram",
        concept: item.concept,
        svg: item.svg,
        assetId: item.id,
        source: "catalog",
        emojiFallback: item.concept.slice(0, 2).toUpperCase() || "◆",
        role: "word-part",
      });
      setSelectedIndex(joined.length - 1);
      return joined;
    });
    setLayout("free");
    setLastAdded(labelFromSlug(item.concept));
  }

  function addMark(mark: StudioMark) {
    setLayers((prev) => {
      const layer: VisualLayer =
        mark.kind === "operator"
          ? { kind: "operator", symbol: mark.value }
          : {
              kind: "text",
              content: mark.value,
              emphasis: mark.emphasis ?? "large",
            };
      const joined = appendLayer(prev, layer);
      setSelectedIndex(joined.length - 1);
      return joined;
    });
    setLayout("free");
    setLastAdded(mark.label);
  }

  function addText() {
    setLayers((prev) => {
      const joined = appendLayer(prev, {
        kind: "text",
        content: "WORD",
        emphasis: "normal",
      });
      setSelectedIndex(joined.length - 1);
      return joined;
    });
    setLayout("free");
  }

  function moveLayerPosition(index: number, position: { x: number; y: number }) {
    const snapped = snapPosition(position);
    setLayers((prev) =>
      prev.map((layer, i) => (i === index ? { ...layer, x: snapped.x, y: snapped.y } : layer))
    );
    setLayout("free");
  }

  function bringForward(index: number) {
    setLayers((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (!item) return prev;
      next.splice(index + 1, 0, item);
      setSelectedIndex(index + 1);
      return next;
    });
  }

  function sendBackward(index: number) {
    setLayers((prev) => {
      if (index <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (!item) return prev;
      next.splice(index - 1, 0, item);
      setSelectedIndex(index - 1);
      return next;
    });
  }

  function removeLayer(index: number) {
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((current) => Math.max(0, Math.min(current, layers.length - 2)));
  }

  async function generateAiImage() {
    const concept = aiPrompt.trim();
    if (concept.length < 2 || aiGenerating || aiQuota.remaining <= 0) return;
    setAiGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept }),
      });
      const data = (await response.json()) as {
        error?: string;
        layer?: Extract<VisualLayer, { kind: "image" }>;
        used?: number;
        limit?: number;
        remaining?: number;
      };
      if (!response.ok || !data.layer) {
        throw new Error(data.error || "AI generation failed");
      }
      if (
        typeof data.used === "number" &&
        typeof data.limit === "number" &&
        typeof data.remaining === "number"
      ) {
        setAiQuota({ used: data.used, limit: data.limit, remaining: data.remaining });
      }
      setLayers((prev) => {
        const joined = appendLayer(prev, data.layer!);
        setSelectedIndex(joined.length - 1);
        return joined;
      });
      setLayout("free");
      setAiPrompt("");
      setStatusMessage(
        `AI image added · ${data.remaining ?? 0} generation${
          (data.remaining ?? 0) === 1 ? "" : "s"
        } left`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
    } finally {
      setAiGenerating(false);
    }
  }

  function loadSubmission(row: StudioSubmission) {
    const locked = row.status === "approved" || row.status === "featured";
    setDraftId(locked ? undefined : row.id);
    setTitle(row.title ?? "");
    setAnswer(row.answer);
    setExplanation(row.explanation ?? "");
    setHints(
      row.hints && row.hints.length >= 3
        ? [row.hints[0] ?? "", row.hints[1] ?? "", row.hints[2] ?? ""]
        : ["", "", ""]
    );
    setTechniqueId(row.techniqueId);
    setDifficulty(row.difficulty);
    setLayout("free");
    setLayers(
      row.visual.layers.map((layer, index) => withDefaultPosition(layer as VisualLayer, index))
    );
    setGrade(row.grade ?? null);
    setEveReview(hydrateEveReviewFromSnapshot(row.eveReview));
    const fingerprint = studioContentFingerprint({
      answer: row.answer,
      explanation: row.explanation ?? "",
      hints:
        row.hints && row.hints.length >= 3
          ? [row.hints[0] ?? "", row.hints[1] ?? "", row.hints[2] ?? ""]
          : ["", "", ""],
      techniqueId: row.techniqueId,
      difficulty: row.difficulty,
      layout: row.visual.layout,
      layers: row.visual.layers,
    });
    setShipFingerprint(row.eveReview?.verdict === "ship" ? fingerprint : null);
    setPublishedSlug(row.status === "approved" || row.status === "featured" ? row.slug : null);
    setStatusMessage(
      locked
        ? `Viewing published “${row.title || row.answer}”. Editing creates a new draft.`
        : `Loaded ${row.status} draft`
    );
    setStep(row.eveReview ? "publish" : "board");
  }

  function save(submit: boolean) {
    setError(null);
    setStatusMessage(null);
    if (submit && !eveShipReady) {
      setError("Run Eve review and get a ship verdict on the current board before publishing.");
      setStep("publish");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch("/api/studio/submissions", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: draftId,
            title: title || answer,
            answer,
            explanation,
            hints,
            techniqueId,
            difficulty,
            layout,
            layers,
            submit,
            deepReview,
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          submission?: StudioSubmission;
          grade?: GradeSnapshot;
          review?: {
            ok?: boolean;
            verdict?: "ship" | "revise" | "reject";
            summary?: string;
            blockers?: string[];
            warnings?: string[];
            checks?: Array<{
              id: string;
              status: LiveCheckStatus;
              detail?: string;
              thinking?: string;
            }>;
          };
        };
        if (data.grade) setGrade(data.grade);
        if (data.review) {
          setEveReview((prev) => ({
            ...prev,
            running: false,
            verdict: data.review?.verdict,
            summary: data.review?.summary,
            blockers: data.review?.blockers ?? [],
            warnings: data.review?.warnings ?? [],
            checks: prev.checks.map((check) => {
              const match = data.review?.checks?.find((c) => c.id === check.id);
              return match
                ? {
                    ...check,
                    status: match.status,
                    detail: match.detail,
                    thinking: match.thinking,
                  }
                : check;
            }),
          }));
        }
        if (data.submission) {
          setDraftId(
            data.submission.status === "approved" || data.submission.status === "featured"
              ? undefined
              : data.submission.id
          );
          setLayers(data.submission.visual.layers);
          setLayout(data.submission.visual.layout);
          if (data.submission.status === "approved" || data.submission.status === "featured") {
            setPublishedSlug(data.submission.slug);
          }
        }
        if (!response.ok) {
          setError(data.error || "Couldn’t save — check the issues below.");
          setStep("publish");
          return;
        }
        if (submit) {
          setStatusMessage(
            "You’re in! Eve shipped it — live on your profile and in the daily lottery."
          );
          setStep("publish");
        } else {
          setStatusMessage("Draft saved. Run Eve’s full review before publishing.");
          setStep("publish");
        }
        const listRes = await fetch("/api/studio/submissions", { credentials: "include" });
        if (listRes.ok) {
          const list = (await listRes.json()) as { submissions: StudioSubmission[] };
          setSubmissions(list.submissions);
        }
      } catch {
        setError("Network error while saving");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Opening Studio…
      </div>
    );
  }

  if (!isAuthenticated || isGuest) {
    return (
      <div className="mx-auto max-w-page px-4 py-12 md:px-6 md:py-16">
        <div className="max-w-2xl">
          <PageHeader
            className="mb-0 md:mb-0"
            description="Tap icons, write the answer, let Eve grade it. Good boards can fill a daily slot and always live on your profile."
            eyebrow="Studio"
            title="Make a rebus in three steps."
          />
          <ol className="mt-10 border-border border-t">
            {[
              {
                title: "Build the board",
                detail: "Tap icons from the catalog to compose your clue.",
              },
              {
                title: "Write the answer",
                detail: "Add the answer, three progressive hints, and how each icon maps to it.",
              },
              {
                title: "Publish",
                detail:
                  "Eve grades it for fairness. Approved boards can land in the daily lottery.",
              },
            ].map((step, i) => (
              <li
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-border border-b py-5 md:grid-cols-[3.5rem_minmax(0,1fr)]"
                key={step.title}
              >
                <span className="pt-1 font-mono text-subtle text-xs tabular-nums">0{i + 1}</span>
                <div>
                  <p className="font-medium tracking-[-0.01em]">{step.title}</p>
                  <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <Link href={isGuest ? "/signup?next=/studio" : "/login?next=/studio"}>
                {isGuest ? "Create a free account" : "Log in to open Studio"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/community">Browse player puzzles</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-5xl px-3 py-8 md:px-6 md:py-12">
        <PageHeader
          actions={
            <>
              {user?.username ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={profilePathForUsername(user.username)}>Your profile</Link>
                </Button>
              ) : null}
              <Button onClick={resetBoard} size="sm" type="button" variant="ghost">
                New board
              </Button>
            </>
          }
          className="mb-0 md:mb-0"
          description="Three steps. Fair icons. Eve grades. Lottery optional."
          eyebrow="Studio"
          title="Build a board."
        />

        <nav
          aria-label="Studio steps"
          className="mt-8 grid grid-cols-3 gap-1 rounded-lg border border-border bg-inset p-1"
        >
          {STEPS.map((item) => {
            const active = step === item.id;
            const locked =
              (item.id === "details" && !canDetails) || (item.id === "publish" && !canDetails);
            return (
              <button
                className={cn(
                  "rounded-md px-2 py-2.5 text-left transition-colors md:px-3",
                  active
                    ? "bg-foreground text-background"
                    : locked
                      ? "cursor-not-allowed text-subtle"
                      : "text-foreground hover:bg-card hover:shadow-sm"
                )}
                aria-current={active ? "step" : undefined}
                disabled={locked && !active}
                key={item.id}
                onClick={() => setStep(item.id)}
                type="button"
              >
                <span className="block font-semibold text-sm">{item.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    active ? "text-background/70" : locked ? "text-subtle" : "text-muted-foreground"
                  )}
                >
                  {item.hint}
                </span>
              </button>
            );
          })}
        </nav>

        {statusMessage ? (
          <p className="mt-4 rounded-lg border border-border bg-inset px-4 py-3 text-sm leading-6">
            {statusMessage}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm leading-6">
            {error}
          </p>
        ) : null}

        {step === "board" ? (
          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border border-border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-sm tracking-[-0.01em]">Start from a template</h2>
                {!loaded ? (
                  <span className="text-xs text-muted-foreground">Loading icons…</span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {STUDIO_TEMPLATES.map((template) => (
                  <button
                    className="rounded-lg border border-border bg-inset px-3 py-3 text-left transition-colors hover:border-border-strong hover:bg-card"
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    type="button"
                  >
                    <span className="block font-medium tracking-[-0.01em]">{template.label}</span>
                    <span className="mt-1 block text-muted-foreground text-xs">
                      {template.blurb}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-5 scroll-mt-20" ref={boardRef}>
                <StudioArtboard
                  onMove={moveLayerPosition}
                  onSelect={setSelectedIndex}
                  selectedIndex={selectedIndex}
                  visual={preview}
                />
              </div>

              {layers.length ? (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {layers.map((layer, index) => (
                      <button
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          selectedIndex === index
                            ? "bg-foreground text-background"
                            : "border border-border bg-inset text-muted-foreground hover:text-foreground"
                        )}
                        key={`${layer.kind}-${index}`}
                        onClick={() => setSelectedIndex(index)}
                        type="button"
                      >
                        {layerLabel(layer)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs [&>button:hover]:text-foreground [&>button]:min-h-11 [&>button]:transition-colors sm:gap-3 sm:[&>button]:min-h-0">
                    <button onClick={() => sendBackward(selectedIndex)} type="button">
                      Send back
                    </button>
                    <button onClick={() => bringForward(selectedIndex)} type="button">
                      Bring forward
                    </button>
                    <button
                      className="text-destructive"
                      onClick={() => removeLayer(selectedIndex)}
                      type="button"
                    >
                      Remove
                    </button>
                    <button onClick={addText} type="button">
                      Add text
                    </button>
                  </div>
                  {selected?.kind === "text" ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <label className="text-sm">
                        Text
                        <input
                          className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                          onChange={(e) =>
                            setLayers((prev) =>
                              prev.map((layer, i) =>
                                i === selectedIndex && layer.kind === "text"
                                  ? { ...layer, content: e.target.value.slice(0, 40) }
                                  : layer
                              )
                            )
                          }
                          value={selected.content}
                        />
                      </label>
                      <label className="text-sm">
                        Size
                        <select
                          className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                          onChange={(e) =>
                            setLayers((prev) =>
                              prev.map((layer, i) =>
                                i === selectedIndex && layer.kind === "text"
                                  ? {
                                      ...layer,
                                      emphasis: e.target.value as
                                        | "normal"
                                        | "large"
                                        | "small"
                                        | "strike"
                                        | "tiny",
                                    }
                                  : layer
                              )
                            )
                          }
                          value={selected.emphasis ?? "normal"}
                        >
                          <option value="normal">Normal</option>
                          <option value="large">Large</option>
                          <option value="small">Small</option>
                          <option value="tiny">Tiny</option>
                          <option value="strike">Strike</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
                {canDetails ? null : (
                  <p className="text-muted-foreground text-xs" id="board-blocker">
                    Add an icon, image or word to continue.
                  </p>
                )}
                <Button
                  aria-describedby={canDetails ? undefined : "board-blocker"}
                  disabled={!canDetails}
                  onClick={() => setStep("details")}
                  type="button"
                >
                  Continue to answer
                </Button>
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-card p-3">
              <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-inset p-1">
                {(
                  [
                    ["icons", "Icons"],
                    ["marks", "Marks"],
                    ["ai", "AI"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    className={cn(
                      "rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      catalogTab === id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={catalogTab === id}
                    key={id}
                    onClick={() => setCatalogTab(id)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {catalogTab !== "ai" ? (
                <input
                  aria-label={catalogTab === "icons" ? "Search icons" : "Search marks"}
                  className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm"
                  onChange={(e) => setCatalogQuery(e.target.value)}
                  type="search"
                  placeholder={catalogTab === "icons" ? "Search icons…" : "Search marks…"}
                  value={catalogQuery}
                />
              ) : null}

              {catalogTab === "icons" ? (
                <div className="mt-3 grid max-h-[420px] grid-cols-3 gap-2 overflow-auto pr-1">
                  {filteredCatalog.map((item) => (
                    <button
                      className="flex flex-col items-center gap-1 rounded-md border border-transparent bg-inset p-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
                      key={item.id}
                      onClick={() => addPictogram(item)}
                      title={`Add ${labelFromSlug(item.concept)}`}
                      type="button"
                    >
                      <span
                        className="inline-flex h-9 w-9 items-center justify-center [&_svg]:h-6 [&_svg]:w-6"
                        dangerouslySetInnerHTML={{ __html: item.svg }}
                      />
                      <span className="w-full truncate text-center">
                        {labelFromSlug(item.concept)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {catalogTab === "marks" ? (
                <div className="mt-3 grid max-h-[420px] grid-cols-3 gap-2 overflow-auto pr-1">
                  {filteredMarks.map((mark) => (
                    <button
                      className="flex flex-col items-center gap-1 rounded-md border border-transparent bg-inset p-2 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
                      key={mark.id}
                      onClick={() => addMark(mark)}
                      title={`Add ${mark.label}`}
                      type="button"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center text-lg font-semibold">
                        {mark.value}
                      </span>
                      <span className="w-full truncate text-center">{mark.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {catalogTab !== "ai" ? (
                <div className="mt-3 flex min-h-6 items-center justify-between gap-2 text-xs">
                  <p aria-live="polite" className="truncate text-muted-foreground">
                    {lastAdded
                      ? `Added ${lastAdded} · ${layers.length} ${layers.length === 1 ? "piece" : "pieces"} on the board`
                      : "Tap a tile to add it to the board."}
                  </p>
                  {lastAdded ? (
                    <button
                      className="-my-2.5 -mr-2 inline-flex min-h-11 shrink-0 items-center rounded px-2 font-medium text-foreground underline-offset-4 hover:underline focus-ring lg:hidden"
                      onClick={() =>
                        boardRef.current?.scrollIntoView({ behavior: "auto", block: "start" })
                      }
                      type="button"
                    >
                      View board
                    </button>
                  ) : null}
                </div>
              ) : null}

              {catalogTab === "ai" ? (
                <div className="mt-3 space-y-3">
                  <p className="text-muted-foreground text-xs leading-5">
                    Generate a custom image tile when the catalog doesn’t have what you need.
                    Lifetime limit: {aiQuota.limit} per account · {aiQuota.remaining} left.
                  </p>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">What should it look like?</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm"
                      disabled={aiGenerating || aiQuota.remaining <= 0}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void generateAiImage();
                        }
                      }}
                      placeholder="e.g. rusty key, tiny bee…"
                      value={aiPrompt}
                    />
                  </label>
                  <Button
                    className="w-full"
                    disabled={aiGenerating || aiQuota.remaining <= 0 || aiPrompt.trim().length < 2}
                    onClick={() => void generateAiImage()}
                    type="button"
                  >
                    {aiGenerating
                      ? "Generating…"
                      : aiQuota.remaining <= 0
                        ? "No generations left"
                        : `Generate (${aiQuota.remaining} left)`}
                  </Button>
                </div>
              ) : null}
            </aside>
          </section>
        ) : null}

        {step === "details" ? (
          <section className="mt-5 rounded-lg border border-border bg-card p-4 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex items-center justify-center rounded-lg border border-border bg-inset p-4">
                <PuzzleVisualBoard
                  fallback={preview.unicodeFallback}
                  size="medium"
                  visual={preview}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="text-muted-foreground">Answer players should type</span>
                  <input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2.5 text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring"
                    onChange={(e) => setAnswer(e.target.value)}
                    spellCheck={false}
                    placeholder="e.g. sunflower"
                    value={answer}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-muted-foreground">
                    How does the board become that answer?
                  </span>
                  <textarea
                    className="mt-1 min-h-28 w-full rounded-md border border-border bg-card px-3 py-2.5 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Sun + flower reads as the compound sunflower…"
                    value={explanation}
                  />
                  <span className="mt-1 block text-subtle text-xs">
                    Shown to players after they solve it.
                    {explanationShortBy > 0
                      ? ` At least ${MIN_EXPLANATION_LENGTH} characters, ${explanationShortBy} to go.`
                      : null}
                  </span>
                </label>
                <div className="grid gap-2 md:grid-cols-3">
                  {hints.map((hint, index) => (
                    <label className="block text-sm" key={`hint-${index}`}>
                      <span className="text-muted-foreground">Hint {index + 1}</span>
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                        onChange={(e) =>
                          setHints((prev) =>
                            prev.map((value, i) => (i === index ? e.target.value : value))
                          )
                        }
                        value={hint}
                      />
                    </label>
                  ))}
                </div>
                <details className="rounded-lg border border-border bg-inset p-3">
                  <summary className="cursor-pointer font-medium text-sm">
                    Advanced (technique & difficulty)
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block text-sm">
                      Technique
                      <select
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                        onChange={(e) => setTechniqueId(e.target.value)}
                        value={techniqueId}
                      >
                        {techniques.map((technique) => (
                          <option key={technique.id} value={technique.id}>
                            {technique.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      Difficulty (1–10)
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                        max={10}
                        min={1}
                        onChange={(e) => setDifficulty(Number(e.target.value) || 5)}
                        type="number"
                        value={difficulty}
                      />
                    </label>
                    <label className="block text-sm md:col-span-2">
                      Title on your profile
                      <input
                        className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 focus-ring transition-[border-color,box-shadow] focus-visible:border-ring text-base md:text-sm"
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={answer || "Optional"}
                        value={title}
                      />
                    </label>
                  </div>
                </details>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <Button onClick={() => setStep("board")} type="button" variant="ghost">
                Back
              </Button>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <p aria-live="polite" className="sr-only">
                  {detailsStatus}
                </p>
                {detailsBlocker ? (
                  <p className="text-muted-foreground text-xs" id="details-blocker">
                    {detailsBlocker}
                  </p>
                ) : null}
                <Button
                  aria-describedby={detailsBlocker ? "details-blocker" : undefined}
                  disabled={!canPublish}
                  onClick={() => setStep("publish")}
                  type="button"
                >
                  Continue to publish
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        {step === "publish" ? (
          <section className="mt-5 rounded-lg border border-border bg-card p-4 md:p-6">
            <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-inset p-4">
                <PuzzleVisualBoard
                  fallback={preview.unicodeFallback}
                  size="medium"
                  visual={preview}
                />
                <p className="mt-3 text-center font-medium text-sm">{answer || "Your answer"}</p>
              </div>
              <div>
                <h2 className="font-semibold text-xl tracking-[-0.04em]">Check and publish</h2>
                <p className="mt-1 text-muted-foreground text-sm leading-6">
                  Eve, our puzzle checker, makes sure your board is fair, safe and solvable. Run the
                  check, fix anything it flags, then publish.
                </p>

                <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    checked={deepReview}
                    className="mt-1"
                    onChange={(e) => setDeepReview(e.target.checked)}
                    type="checkbox"
                  />
                  <span>
                    Deep review
                    <span className="mt-0.5 block text-muted-foreground text-xs">
                      Eve also tries to solve it like a player would. Slower, and not always
                      available.
                    </span>
                  </span>
                </label>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    disabled={pending || reviewing || !canPublish}
                    onClick={() => void runEveReviewStream()}
                    type="button"
                    variant="outline"
                  >
                    {reviewing
                      ? "Eve is checking…"
                      : eveShipReady
                        ? "Check again"
                        : "Run the check"}
                  </Button>
                  <Button
                    disabled={pending || reviewing || !canPublish}
                    onClick={() => save(false)}
                    type="button"
                    variant="ghost"
                  >
                    {pending ? "Saving…" : "Save draft"}
                  </Button>
                  <Button
                    disabled={pending || reviewing || !canSubmitPublish}
                    onClick={() => save(true)}
                    type="button"
                  >
                    {pending ? "Publishing…" : "Publish puzzle"}
                  </Button>
                </div>
                {!eveShipReady && canPublish ? (
                  <p className="mt-2 text-muted-foreground text-xs leading-5">
                    Publish unlocks once Eve says the board is ready. If you change anything, run
                    the check again.
                  </p>
                ) : null}

                <EveReviewPanel state={eveReview} />

                {grade ? (
                  <div
                    className={cn(
                      "mt-5 rounded-xl border px-4 py-3 text-sm",
                      grade.ok ? "border-border bg-inset" : "border-warning/40 bg-warning/10"
                    )}
                  >
                    <p className="font-medium">
                      Quick check
                      <span className="ml-2 font-normal opacity-70">
                        quality {grade.score} · fun {grade.funScore}
                      </span>
                    </p>
                    {grade.issues.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {grade.issues.map((issue) => (
                          <li key={issue}>{humanizeGradeIssue(issue)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 opacity-80">Nothing blocking.</p>
                    )}
                  </div>
                ) : null}

                {publishedSlug && user?.username ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild variant="secondary">
                      <Link href={communityPuzzlePath(publishedSlug)}>Play your puzzle</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={profilePathForUsername(user.username)}>View on your profile</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 border-border border-t pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-sm tracking-[-0.01em]">Your puzzles</h3>
                <Link
                  className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                  href="/community"
                >
                  Community →
                </Link>
              </div>
              {submissions.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing published yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {submissions.slice(0, 8).map((row) => (
                    <li
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                      key={row.id}
                    >
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => loadSubmission(row)}
                        type="button"
                      >
                        <span className="block truncate font-medium tracking-[-0.01em]">
                          {row.title || row.answer}
                        </span>
                        <span className="font-medium text-xs text-subtle">
                          {submissionStatusLabel(row.status)}
                          {row.featuredOn ? ` · daily ${row.featuredOn}` : ""}
                        </span>
                      </button>
                      {row.status === "approved" || row.status === "featured" ? (
                        <Link
                          className="shrink-0 text-sm underline-offset-4 hover:underline"
                          href={communityPuzzlePath(row.slug)}
                        >
                          Open
                        </Link>
                      ) : (
                        <button
                          className="shrink-0 text-sm underline-offset-4 hover:underline"
                          onClick={() => loadSubmission(row)}
                          type="button"
                        >
                          Edit
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6">
              <Button onClick={() => setStep("details")} type="button" variant="ghost">
                Back
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
