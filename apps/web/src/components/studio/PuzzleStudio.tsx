"use client";

import {
  ArrowLeft,
  Check,
  Hammer,
  type LucideIcon,
  Play,
  Redo2,
  Send,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import { defaultPositionForIndex, snapPosition } from "@/ai/puzzle-agent/visual/layer-position";
import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import {
  type EveReviewLiveState,
  EveReviewPanel,
  emptyEveReviewState,
  type LiveCheckStatus,
} from "@/components/studio/EveReviewPanel";
import { StudioArtboard } from "@/components/studio/StudioArtboard";
import { StudioClueCard, type TechniqueOption } from "@/components/studio/StudioClueCard";
import {
  type AiQuota,
  type CatalogPictogram,
  type RecentPart,
  StudioPartsTray,
  type TextEmphasis,
} from "@/components/studio/StudioPartsTray";
import { StudioPieceBar } from "@/components/studio/StudioPieceBar";
import { StudioTestPlay } from "@/components/studio/StudioTestPlay";
import { StudioWorkshop, type WorkshopLevel } from "@/components/studio/StudioWorkshop";
import { Button } from "@/components/ui/button";
import { labelFromSlug } from "@/lib/typography";
import { EVE_REVIEW_CHECKS, EVE_REVIEW_PHASES } from "@/lib/ugc/eve-review-manifest";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import {
  clearStudioDraft,
  draftHasContent,
  loadStudioDraft,
  type StudioDraft,
  saveStudioDraft,
} from "@/lib/ugc/studio-draft";
import { STUDIO_AI_GENERATION_LIMIT, type StudioMark } from "@/lib/ugc/studio-marks";
import {
  humanizeGradeIssue,
  STUDIO_TEMPLATES,
  type StudioTemplate,
} from "@/lib/ugc/studio-templates";
import { cn } from "@/lib/utils";

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
  // Held after a review asked for changes (the brief staging during publish never lingers).
  pending_grade: "Needs changes",
  approved: "Published",
  featured: "Featured",
  rejected: "Not published",
};

function submissionStatusLabel(status: string) {
  return SUBMISSION_STATUS_LABELS[status] ?? labelFromSlug(status);
}

const MIN_ANSWER_LENGTH = 2;
const MIN_EXPLANATION_LENGTH = 24;
const HISTORY_LIMIT = 60;
const RECENT_LIMIT = 8;

type EditorMode = "make" | "test" | "publish";

const MODES: Array<{ id: EditorMode; label: string; icon: LucideIcon }> = [
  { id: "make", label: "Make", icon: Hammer },
  { id: "test", label: "Test", icon: Play },
  { id: "publish", label: "Publish", icon: Send },
];

function pictogramLayer(item: CatalogPictogram): VisualLayer {
  return {
    kind: "pictogram",
    concept: item.concept,
    svg: item.svg,
    assetId: item.id,
    source: "catalog",
    emojiFallback: item.concept.slice(0, 2).toUpperCase() || "◆",
    role: "word-part",
  };
}

function templateLayers(template: StudioTemplate, pictograms: CatalogPictogram[]): VisualLayer[] {
  const layers: VisualLayer[] = [];
  for (const concept of template.concepts) {
    const item = pictograms.find((p) => p.concept === concept || p.id === concept);
    if (item) layers.push(withDefaultPosition(pictogramLayer(item), layers.length));
  }
  for (const text of template.textLayers ?? []) {
    layers.push(
      withDefaultPosition(
        { kind: "text", content: text.content, emphasis: text.emphasis ?? "normal" },
        layers.length
      )
    );
  }
  return layers;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/** The sample board on the signed-out screen: text only, so it needs no catalog. */
const GUEST_SAMPLE: PuzzleVisual = buildPreview("free", [
  { kind: "text", content: "DEAL", emphasis: "large", x: 50, y: 50 },
]);

function StudioGuest({ isGuest }: { isGuest: boolean }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="mt-3 text-balance font-semibold text-4xl tracking-[-0.045em]">
            Make the puzzle. Stump the players.
          </h1>
          <p className="mt-3 max-w-md text-pretty text-muted-foreground leading-7">
            Drop parts on a stage, play your own board, and let Eve check it’s fair. Good boards go
            live on your profile and can land in the daily puzzle.
          </p>
          <div className="mt-8 flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg" variant="brand">
              <Link href={isGuest ? "/signup?next=/studio" : "/login?next=/studio"}>
                {isGuest ? "Create a free account" : "Log in to open Studio"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/community">Browse player puzzles</Link>
            </Button>
          </div>
        </div>

        <div aria-hidden className="rounded-2xl border border-border bg-inset p-3">
          <div className="studio-toolbar mb-3 w-fit">
            {MODES.map(({ id, label, icon: Icon }) => (
              <span
                aria-current={id === "make" ? "step" : undefined}
                className="studio-tool pointer-events-none"
                key={id}
              >
                <Icon className="size-4" />
                {label}
              </span>
            ))}
          </div>
          <div className="studio-stage pointer-events-none flex items-center justify-center">
            <div className="studio-piece-inner">
              <PuzzleVisualBoard fallback="DEAL" size="large" visual={GUEST_SAMPLE} />
            </div>
          </div>
          <p className="mt-3 px-1 text-muted-foreground text-xs">
            A big DEAL. Answer: <span className="font-medium text-foreground">big deal</span>
          </p>
        </div>
      </div>

      <ol className="mt-12 grid gap-3 md:grid-cols-3">
        {[
          {
            icon: Hammer,
            title: "Make",
            detail: "Drop icons, marks and words on the stage. Size and placement carry meaning.",
          },
          {
            icon: Play,
            title: "Test",
            detail: "Play your own board the way players will, hints and all.",
          },
          {
            icon: ShieldCheck,
            title: "Publish",
            detail: "Eve checks it’s fair and solvable. Then it’s live on your profile.",
          },
        ].map(({ icon: Icon, title, detail }, i) => (
          <li className="rounded-xl border border-border bg-card p-4" key={title}>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-inset">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="font-mono text-subtle text-xs tabular-nums">0{i + 1}</span>
            </div>
            <p className="mt-3 font-medium">{title}</p>
            <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">{detail}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function PuzzleStudio() {
  const { isAuthenticated, isGuest, isLoading, user } = useAuth();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"workshop" | "editor">("workshop");
  const [mode, setMode] = useState<EditorMode>("make");
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
  const [past, setPast] = useState<VisualLayer[][]>([]);
  const [future, setFuture] = useState<VisualLayer[][]>([]);
  const [coalesceKey, setCoalesceKey] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [marks, setMarks] = useState<StudioMark[]>([]);
  const [recent, setRecent] = useState<RecentPart[]>([]);
  const [aiQuota, setAiQuota] = useState<AiQuota>({
    used: 0,
    limit: STUDIO_AI_GENERATION_LIMIT,
    remaining: STUDIO_AI_GENERATION_LIMIT,
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [grade, setGrade] = useState<GradeSnapshot | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  /** Confirms a tray tap with a live line, since the stage can be out of view on phones. */
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [deepReview, setDeepReview] = useState(false);
  const [shipFingerprint, setShipFingerprint] = useState<string | null>(null);
  const [testedFingerprint, setTestedFingerprint] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<StudioDraft | null>(null);
  const [eveReview, setEveReview] = useState<EveReviewLiveState>(() =>
    hydrateEveReviewFromSnapshot(null)
  );

  const preview = useMemo(() => buildPreview(layout, layers), [layout, layers]);
  const selected = selectedIndex >= 0 ? layers[selectedIndex] : undefined;
  const canDetails = layers.some(
    (l) => l.kind === "pictogram" || l.kind === "text" || l.kind === "image"
  );
  const hasAnswer = answer.trim().length >= MIN_ANSWER_LENGTH;
  const canTest = canDetails && hasAnswer;
  const canPublish = canTest && explanation.trim().length >= MIN_EXPLANATION_LENGTH;
  const explanationShortBy = Math.max(0, MIN_EXPLANATION_LENGTH - explanation.trim().length);
  /** Why a later mode is locked, so its button never just sits there greyed out. */
  const testBlocker = !canDetails
    ? "Add an icon, image or word to the stage."
    : !hasAnswer
      ? "Add the answer players should type."
      : null;
  const publishBlocker =
    testBlocker ??
    (explanationShortBy > 0
      ? `Explain the board in ${explanationShortBy} more ${explanationShortBy === 1 ? "character" : "characters"}.`
      : null);
  /** Coarse version for screen readers: changes per requirement, not per keystroke. */
  const publishStatus = testBlocker
    ? testBlocker
    : explanationShortBy > 0
      ? `The explanation needs at least ${MIN_EXPLANATION_LENGTH} characters.`
      : "Ready to test and publish.";
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
  const testCleared = testedFingerprint === currentFingerprint;
  const boardName = title.trim() || answer.trim() || "Untitled board";

  useEffect(() => {
    const draft = loadStudioDraft();
    if (draftHasContent(draft)) setSavedDraft(draft);
  }, []);

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

  // Autosave the board in progress, like a game's save slot.
  useEffect(() => {
    if (view !== "editor") return;
    const timer = window.setTimeout(() => {
      const draft: StudioDraft = {
        draftId,
        title,
        answer,
        explanation,
        hints,
        techniqueId,
        difficulty,
        layout,
        layers,
        savedAt: Date.now(),
      };
      if (draftHasContent(draft)) {
        saveStudioDraft(draft);
        setSavedDraft(draft);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [view, draftId, title, answer, explanation, hints, techniqueId, difficulty, layout, layers]);

  /** Every board edit goes through here so it can be undone. Typing into one field coalesces. */
  const editLayers = useCallback(
    (next: VisualLayer[], coalesce?: string) => {
      if (!coalesce || coalesce !== coalesceKey) {
        setPast((prev) => [...prev, layers].slice(-HISTORY_LIMIT));
      }
      setFuture([]);
      setCoalesceKey(coalesce ?? null);
      setLayers(next);
      setLayout("free");
    },
    [coalesceKey, layers]
  );

  const undo = useCallback(() => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast(past.slice(0, -1));
    setFuture([layers, ...future].slice(0, HISTORY_LIMIT));
    setCoalesceKey(null);
    setLayers(previous);
    setSelectedIndex((i) => Math.min(i, previous.length - 1));
  }, [past, future, layers]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setFuture(future.slice(1));
    setPast([...past, layers].slice(-HISTORY_LIMIT));
    setCoalesceKey(null);
    setLayers(next);
    setSelectedIndex((i) => Math.min(i, next.length - 1));
  }, [past, future, layers]);

  function loadBoard(next: {
    draftId?: string;
    title: string;
    answer: string;
    explanation: string;
    hints: string[];
    techniqueId: string;
    difficulty: number;
    layers: VisualLayer[];
  }) {
    setDraftId(next.draftId);
    setTitle(next.title);
    setAnswer(next.answer);
    setExplanation(next.explanation);
    setHints(
      next.hints.length >= 3
        ? [next.hints[0] ?? "", next.hints[1] ?? "", next.hints[2] ?? ""]
        : ["", "", ""]
    );
    setTechniqueId(next.techniqueId);
    setDifficulty(next.difficulty);
    setLayout("free");
    setLayers(next.layers.map((layer, index) => withDefaultPosition(layer, index)));
    setPast([]);
    setFuture([]);
    setCoalesceKey(null);
    setSelectedIndex(-1);
    setLastAdded(null);
    setGrade(null);
    setPublishedSlug(null);
    setStatusMessage(null);
    setError(null);
    setEveReview(hydrateEveReviewFromSnapshot(null));
    setShipFingerprint(null);
    setTestedFingerprint(null);
    setDeepReview(false);
    setMode("make");
    setView("editor");
    window.scrollTo({ top: 0 });
  }

  function newBoard() {
    loadBoard({
      title: "",
      answer: "",
      explanation: "",
      hints: ["", "", ""],
      techniqueId: "simple_compound",
      difficulty: 5,
      layers: [],
    });
  }

  function continueDraft() {
    if (!savedDraft) return;
    loadBoard(savedDraft);
    setStatusMessage("Picked up where you left off.");
  }

  function applyTemplate(template: StudioTemplate) {
    loadBoard({
      title: template.label,
      answer: template.answer,
      explanation: template.explanation,
      hints: [...template.hints],
      techniqueId: template.techniqueId,
      difficulty: template.difficulty,
      layers: templateLayers(template, pictograms),
    });
    setStatusMessage(
      `Loaded the “${template.label}” starter. Move things around and make it yours.`
    );
  }

  function openSubmission(id: string) {
    const row = submissions.find((s) => s.id === id);
    if (!row) return;
    const locked = row.status === "approved" || row.status === "featured";
    loadBoard({
      draftId: locked ? undefined : row.id,
      title: row.title ?? "",
      answer: row.answer,
      explanation: row.explanation ?? "",
      hints: row.hints ?? [],
      techniqueId: row.techniqueId,
      difficulty: row.difficulty,
      layers: row.visual.layers as VisualLayer[],
    });
    setGrade(row.grade ?? null);
    setEveReview(hydrateEveReviewFromSnapshot(row.eveReview));
    const hintsTriple =
      row.hints && row.hints.length >= 3
        ? [row.hints[0] ?? "", row.hints[1] ?? "", row.hints[2] ?? ""]
        : ["", "", ""];
    const fingerprint = studioContentFingerprint({
      answer: row.answer,
      explanation: row.explanation ?? "",
      hints: hintsTriple,
      techniqueId: row.techniqueId,
      difficulty: row.difficulty,
      layout: "free",
      layers: row.visual.layers.map((layer, index) =>
        withDefaultPosition(layer as VisualLayer, index)
      ),
    });
    setShipFingerprint(row.eveReview?.verdict === "ship" ? fingerprint : null);
    setPublishedSlug(locked ? row.slug : null);
    setStatusMessage(
      locked
        ? `Viewing published “${row.title || row.answer}”. Editing creates a new draft.`
        : `Opened your ${submissionStatusLabel(row.status).toLowerCase()} board.`
    );
    if (row.eveReview) setMode("publish");
  }

  function pushRecent(part: RecentPart) {
    setRecent((prev) =>
      [part, ...prev.filter((p) => !(p.kind === part.kind && p.id === part.id))].slice(
        0,
        RECENT_LIMIT
      )
    );
  }

  function addLayer(layer: VisualLayer, label: string) {
    const next = appendLayer(layers, layer);
    editLayers(next);
    setSelectedIndex(next.length - 1);
    setLastAdded(label);
  }

  function addPictogram(item: CatalogPictogram) {
    addLayer(pictogramLayer(item), labelFromSlug(item.concept));
    pushRecent({ kind: "icon", id: item.id });
  }

  function addMark(mark: StudioMark) {
    addLayer(
      mark.kind === "operator"
        ? { kind: "operator", symbol: mark.value }
        : { kind: "text", content: mark.value, emphasis: mark.emphasis ?? "large" },
      mark.label
    );
    pushRecent({ kind: "mark", id: mark.id });
  }

  function addText(content: string, emphasis: TextEmphasis) {
    addLayer({ kind: "text", content, emphasis }, content);
  }

  function moveLayerPosition(index: number, position: { x: number; y: number }) {
    const snapped = snapPosition(position);
    editLayers(
      layers.map((layer, i) => (i === index ? { ...layer, x: snapped.x, y: snapped.y } : layer))
    );
  }

  function updateSelectedText(patch: { content?: string; emphasis?: TextEmphasis }) {
    editLayers(
      layers.map((layer, i) =>
        i === selectedIndex && layer.kind === "text" ? { ...layer, ...patch } : layer
      ),
      patch.content !== undefined ? `text-${selectedIndex}` : undefined
    );
  }

  function reorder(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (index < 0 || target < 0 || target >= layers.length) return;
    const next = [...layers];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(target, 0, item);
    editLayers(next);
    setSelectedIndex(target);
  }

  const duplicateSelected = useCallback(() => {
    const layer = selectedIndex >= 0 ? layers[selectedIndex] : undefined;
    if (!layer) return;
    const from = withDefaultPosition(layer, selectedIndex);
    const copy = {
      ...from,
      ...snapPosition({ x: (from.x ?? 50) + 10, y: (from.y ?? 50) + 10 }),
    } as VisualLayer;
    const next = [...layers, copy];
    editLayers(next);
    setSelectedIndex(next.length - 1);
  }, [editLayers, layers, selectedIndex]);

  const removeSelected = useCallback(() => {
    if (selectedIndex < 0 || selectedIndex >= layers.length) return;
    const next = layers.filter((_, i) => i !== selectedIndex);
    editLayers(next);
    setSelectedIndex(next.length ? Math.min(selectedIndex, next.length - 1) : -1);
    setLastAdded(null);
  }, [editLayers, layers, selectedIndex]);

  // Editor hotkeys, the ones every level editor has.
  useEffect(() => {
    if (view !== "editor" || mode !== "make") return;
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (meta && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (meta && key === "y") {
        event.preventDefault();
        redo();
      } else if (!meta && (event.key === "Delete" || event.key === "Backspace")) {
        if (selectedIndex < 0) return;
        event.preventDefault();
        removeSelected();
      } else if (!meta && key === "d") {
        if (selectedIndex < 0) return;
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === "Escape") {
        setSelectedIndex(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, mode, undo, redo, removeSelected, duplicateSelected, selectedIndex]);

  async function generateAiImage(concept: string): Promise<boolean> {
    if (concept.length < 2 || aiGenerating || aiQuota.remaining <= 0) return false;
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
      addLayer(data.layer, concept);
      setStatusMessage(
        `AI tile added · ${data.remaining ?? 0} drawing${(data.remaining ?? 0) === 1 ? "" : "s"} left`
      );
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI generation failed");
      return false;
    } finally {
      setAiGenerating(false);
    }
  }

  function reviewPayload() {
    return {
      id: draftId,
      title: title.trim() || undefined,
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
            setShipFingerprint(review?.verdict === "ship" ? currentFingerprint : null);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Eve review failed";
      setError(message);
      setEveReview((prev) => ({ ...prev, running: false, error: message }));
    } finally {
      setReviewing(false);
      setEveReview((prev) => ({ ...prev, running: false }));
    }
  }

  function save(submit: boolean) {
    setError(null);
    setStatusMessage(null);
    if (submit && !eveShipReady) {
      setError("Run Eve’s check and get a ready verdict on the current board before publishing.");
      setMode("publish");
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
            title: title.trim() || undefined,
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
        const live =
          data.submission?.status === "approved" || data.submission?.status === "featured";
        if (data.submission) {
          setDraftId(live ? undefined : data.submission.id);
          setLayers(data.submission.visual.layers);
          setLayout(data.submission.visual.layout);
          if (live) setPublishedSlug(data.submission.slug);
        }
        if (!response.ok) {
          setError(data.error || "Couldn’t save. Check the notes below.");
          return;
        }
        if (submit) {
          setStatusMessage(
            "You’re in! Eve shipped it. It’s live on your profile and in the daily lottery."
          );
          if (live) {
            clearStudioDraft();
            setSavedDraft(null);
          }
        } else {
          setStatusMessage("Draft saved to your boards.");
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

  const templatePreviews = useMemo(
    () =>
      STUDIO_TEMPLATES.map((template) => ({
        template,
        visual: buildPreview("free", templateLayers(template, pictograms)),
      })),
    [pictograms]
  );

  const levels: WorkshopLevel[] = useMemo(
    () =>
      submissions.map((row) => ({
        id: row.id,
        slug: row.slug,
        status: row.status,
        statusLabel: submissionStatusLabel(row.status),
        name: row.title || row.answer,
        featuredOn: row.featuredOn,
        visual: {
          ...row.visual,
          layers: row.visual.layers.map((layer, index) =>
            withDefaultPosition(layer as VisualLayer, index)
          ),
          layout: "free",
        },
      })),
    [submissions]
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        Opening Studio…
      </div>
    );
  }

  if (!isAuthenticated || isGuest) {
    return <StudioGuest isGuest={isGuest} />;
  }

  if (view === "workshop") {
    return (
      <>
        {error ? (
          <p className="mx-auto mt-6 max-w-5xl rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <StudioWorkshop
          draft={
            savedDraft
              ? {
                  name: savedDraft.title.trim() || savedDraft.answer.trim() || "Untitled board",
                  pieces: savedDraft.layers.length,
                  visual: buildPreview("free", savedDraft.layers),
                }
              : null
          }
          levels={levels}
          loaded={loaded}
          onContinue={continueDraft}
          onNew={newBoard}
          onOpenLevel={openSubmission}
          onTemplate={applyTemplate}
          templates={templatePreviews}
          username={user?.username}
        />
      </>
    );
  }

  const modeBlocker = (id: EditorMode) =>
    id === "test" ? testBlocker : id === "publish" ? publishBlocker : null;

  return (
    <div className="flex flex-col">
      <div className="border-border border-b bg-background/95 backdrop-blur lg:sticky lg:top-0 lg:z-30">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2 px-3 py-2 md:px-5">
          <Button
            aria-label="Back to workshop"
            onClick={() => {
              setView("workshop");
              window.scrollTo({ top: 0 });
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ArrowLeft aria-hidden />
            <span className="hidden sm:inline">Workshop</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-sm tracking-[-0.01em]">{boardName}</p>
            <p className="text-subtle text-xs">
              {layers.length} {layers.length === 1 ? "piece" : "pieces"}
              {savedDraft ? " · autosaved" : ""}
            </p>
          </div>
          <div className="studio-toolbar">
            <button
              aria-label="Undo"
              className="studio-tool"
              disabled={!past.length || mode !== "make"}
              onClick={undo}
              title="Undo (⌘Z)"
              type="button"
            >
              <Undo2 aria-hidden className="size-4" />
            </button>
            <button
              aria-label="Redo"
              className="studio-tool"
              disabled={!future.length || mode !== "make"}
              onClick={redo}
              title="Redo (⇧⌘Z)"
              type="button"
            >
              <Redo2 aria-hidden className="size-4" />
            </button>
          </div>
          <nav
            aria-label="Studio modes"
            className="studio-toolbar order-last w-full sm:order-none sm:w-auto"
          >
            {MODES.map(({ id, label, icon: Icon }) => {
              const blocker = modeBlocker(id);
              return (
                <button
                  aria-current={mode === id ? "step" : undefined}
                  aria-describedby={blocker && mode !== id ? "studio-mode-blocker" : undefined}
                  className="studio-tool flex-1 px-3 sm:flex-none"
                  disabled={Boolean(blocker) && mode !== id}
                  key={id}
                  onClick={() => {
                    setMode(id);
                    setSelectedIndex(-1);
                    setStatusMessage(null);
                  }}
                  title={blocker ?? undefined}
                  type="button"
                >
                  <Icon aria-hidden className="size-4" />
                  {label}
                  {id === "test" && testCleared ? (
                    <Check aria-label="cleared" className="size-3.5 text-success" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-3 py-4 md:px-5 md:py-5">
        {statusMessage ? (
          <p
            aria-live="polite"
            className="rb-enter mb-4 rounded-lg border border-border bg-inset px-4 py-2.5 text-sm leading-6"
          >
            {statusMessage}
          </p>
        ) : null}
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-destructive text-sm leading-6">
            {error}
          </p>
        ) : null}

        {mode === "make" ? (
          <div className="grid gap-4 lg:grid-cols-[256px_minmax(0,1fr)] 2xl:grid-cols-[272px_minmax(0,1fr)_340px]">
            <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1">
              <StudioArtboard
                onMove={moveLayerPosition}
                onSelect={setSelectedIndex}
                selectedIndex={selectedIndex}
                visual={preview}
              />
              <StudioPieceBar
                count={layers.length}
                index={selectedIndex}
                layer={selected}
                onBringForward={() => reorder(selectedIndex, 1)}
                onDuplicate={duplicateSelected}
                onEmphasisChange={(emphasis) => updateSelectedText({ emphasis })}
                onRemove={removeSelected}
                onSendBack={() => reorder(selectedIndex, -1)}
                onTextChange={(content) => updateSelectedText({ content })}
              />
            </div>

            <StudioPartsTray
              aiGenerating={aiGenerating}
              aiQuota={aiQuota}
              className="lg:sticky lg:top-20 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start"
              lastAdded={lastAdded}
              loaded={loaded}
              marks={marks}
              onAddMark={addMark}
              onAddPictogram={addPictogram}
              onAddText={addText}
              onGenerateAi={generateAiImage}
              pictograms={pictograms}
              pieceCount={layers.length}
              recent={recent}
            />

            <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 2xl:col-start-3 2xl:row-start-1">
              <StudioClueCard
                answer={answer}
                difficulty={difficulty}
                explanation={explanation}
                hints={hints}
                minExplanationLength={MIN_EXPLANATION_LENGTH}
                onAnswer={setAnswer}
                onDifficulty={setDifficulty}
                onExplanation={setExplanation}
                onHint={(index, value) =>
                  setHints((prev) => prev.map((h, i) => (i === index ? value : h)))
                }
                onTechnique={setTechniqueId}
                onTitle={setTitle}
                techniqueId={techniqueId}
                techniques={techniques}
                title={title}
              />
              <div className="flex flex-wrap items-center justify-end gap-3">
                <p aria-live="polite" className="sr-only">
                  {publishStatus}
                </p>
                {testBlocker ? (
                  <p className="text-muted-foreground text-xs" id="studio-mode-blocker">
                    {testBlocker}
                  </p>
                ) : null}
                <Button
                  aria-describedby={testBlocker ? "studio-mode-blocker" : undefined}
                  disabled={!canTest}
                  onClick={() => {
                    setMode("test");
                    setSelectedIndex(-1);
                    setStatusMessage(null);
                    window.scrollTo({ top: 0 });
                  }}
                  type="button"
                  variant="brand"
                >
                  <Play aria-hidden />
                  Test play
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {mode === "test" ? (
          <StudioTestPlay
            answer={answer}
            cleared={testCleared}
            explanation={explanation}
            hints={hints}
            onBackToMake={() => setMode("make")}
            onCleared={() => setTestedFingerprint(currentFingerprint)}
            onContinue={() => setMode(canPublish ? "publish" : "make")}
            visual={preview}
          />
        ) : null}

        {mode === "publish" ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-center rounded-xl border border-border bg-card px-4 py-8">
                <PuzzleVisualBoard
                  fallback={preview.unicodeFallback}
                  size="medium"
                  visual={preview}
                />
              </div>
              <ul className="rounded-xl border border-border bg-card p-2 text-sm">
                {[
                  { done: canDetails, label: "Board has pieces", required: true },
                  {
                    done: hasAnswer,
                    label: `Answer: ${answer.trim() || "missing"}`,
                    required: true,
                  },
                  { done: explanationShortBy === 0, label: "Explanation written", required: true },
                  {
                    done: hints.every((h) => h.trim()),
                    label: "Three hints",
                    required: false,
                  },
                  { done: testCleared, label: "Cleared in test play", required: false },
                  { done: eveShipReady, label: "Eve says it’s ready", required: true },
                ].map((row) => (
                  <li className="flex min-h-9 items-center gap-2.5 px-2" key={row.label}>
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full",
                        row.done ? "bg-success text-background" : "border border-border-strong"
                      )}
                    >
                      {row.done ? <Check aria-hidden className="size-3" /> : null}
                    </span>
                    <span className={cn("min-w-0 truncate", !row.done && "text-muted-foreground")}>
                      {row.label}
                    </span>
                    <span className="sr-only">{row.done ? "done" : "not done"}</span>
                    {!row.required ? (
                      <span className="ml-auto shrink-0 text-subtle text-xs">optional</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              {publishBlocker ? (
                <Button onClick={() => setMode("make")} type="button" variant="outline">
                  Back to make: {publishBlocker}
                </Button>
              ) : null}
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div>
                <h2 className="font-semibold text-xl tracking-[-0.04em]">Check and publish</h2>
                <p className="mt-1 text-muted-foreground text-sm leading-6">
                  Eve, our puzzle checker, makes sure your board is fair, safe and solvable. Run the
                  check, fix anything it flags, then publish.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-2 text-sm">
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

              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={pending || reviewing || !canPublish}
                  onClick={() => void runEveReviewStream()}
                  type="button"
                  variant={eveShipReady ? "outline" : "default"}
                >
                  <ShieldCheck aria-hidden />
                  {reviewing ? "Eve is checking…" : eveShipReady ? "Check again" : "Run the check"}
                </Button>
                <Button
                  disabled={pending || reviewing || !canSubmitPublish}
                  onClick={() => save(true)}
                  type="button"
                  variant="brand"
                >
                  <Send aria-hidden />
                  {pending ? "Publishing…" : "Publish puzzle"}
                </Button>
                <Button
                  disabled={pending || reviewing || !canPublish}
                  onClick={() => save(false)}
                  type="button"
                  variant="ghost"
                >
                  {pending ? "Saving…" : "Save draft"}
                </Button>
              </div>
              {!eveShipReady && canPublish ? (
                <p className="-mt-2 text-muted-foreground text-xs leading-5">
                  Publish unlocks once Eve says the board is ready. If you change anything, run the
                  check again.
                </p>
              ) : null}

              <EveReviewPanel state={eveReview} />

              {grade ? (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm",
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
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="secondary">
                    <Link href={communityPuzzlePath(publishedSlug)}>Play your puzzle</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={profilePathForUsername(user.username)}>View on your profile</Link>
                  </Button>
                  <Button onClick={newBoard} type="button" variant="ghost">
                    Make another
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
