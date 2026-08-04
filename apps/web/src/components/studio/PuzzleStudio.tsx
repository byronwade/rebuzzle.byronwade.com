"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
import { AppLink as Link } from "@/components/AppLink";
import { useAuth } from "@/components/AuthProvider";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { Button } from "@/components/ui/button";
import {
  humanizeGradeIssue,
  STUDIO_TEMPLATES,
  type StudioTemplate,
} from "@/lib/ugc/studio-templates";
import { profilePathForUsername, communityPuzzlePath } from "@/lib/ugc/slug";
import { cn } from "@/lib/utils";

type CatalogPictogram = { id: string; concept: string; svg: string };
type TechniqueOption = { id: string; name: string; summary: string };

type GradeSnapshot = {
  ok: boolean;
  score: number;
  funScore: number;
  issues: string[];
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
  puzzleId?: string;
  featuredOn?: string;
};

type StepId = "board" | "details" | "publish";

const STEPS: Array<{ id: StepId; label: string; hint: string }> = [
  { id: "board", label: "1 · Board", hint: "Pick icons" },
  { id: "details", label: "2 · Answer", hint: "Explain it" },
  { id: "publish", label: "3 · Publish", hint: "Eve checks" },
];

function layerLabel(layer: VisualLayer): string {
  if (layer.kind === "pictogram") return layer.concept;
  if (layer.kind === "text") return layer.content;
  if (layer.kind === "operator") return layer.symbol;
  return layer.concept || "image";
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

function appendWithJoiner(prev: VisualLayer[], next: VisualLayer): VisualLayer[] {
  const last = prev[prev.length - 1];
  const needsJoiner =
    last &&
    (last.kind === "pictogram" || last.kind === "text") &&
    (next.kind === "pictogram" || next.kind === "text");
  return needsJoiner ? [...prev, { kind: "operator", symbol: "+" }, next] : [...prev, next];
}

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
  const [layout, setLayout] = useState<PuzzleVisual["layout"]>("row");
  const [layers, setLayers] = useState<VisualLayer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [grade, setGrade] = useState<GradeSnapshot | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const preview = useMemo(() => buildPreview(layout, layers), [layout, layers]);
  const selected = layers[selectedIndex];
  const canDetails = layers.some((l) => l.kind === "pictogram" || l.kind === "text");
  const canPublish = canDetails && answer.trim().length >= 2 && explanation.trim().length >= 24;

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
          };
          setPictograms(data.pictograms);
          setTechniques(data.techniques);
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
    if (!q) return pictograms.slice(0, 36);
    return pictograms.filter((p) => p.concept.includes(q) || p.id.includes(q)).slice(0, 36);
  }, [catalogQuery, pictograms]);

  function resetBoard() {
    setDraftId(undefined);
    setTitle("");
    setAnswer("");
    setExplanation("");
    setHints(["", "", ""]);
    setTechniqueId("simple_compound");
    setDifficulty(5);
    setLayout("row");
    setLayers([]);
    setSelectedIndex(0);
    setGrade(null);
    setPublishedSlug(null);
    setStatusMessage(null);
    setError(null);
    setStep("board");
  }

  function applyTemplate(template: StudioTemplate) {
    const nextLayers: VisualLayer[] = [];
    for (const concept of template.concepts) {
      const item = pictograms.find((p) => p.concept === concept || p.id === concept);
      if (!item) continue;
      const pictogram: VisualLayer = {
        kind: "pictogram",
        concept: item.concept,
        svg: item.svg,
        assetId: item.id,
        source: "catalog",
        emojiFallback: item.concept.slice(0, 2).toUpperCase() || "◆",
        role: "word-part",
      };
      const joined = appendWithJoiner(nextLayers, pictogram);
      nextLayers.length = 0;
      nextLayers.push(...joined);
    }
    for (const text of template.textLayers ?? []) {
      const layer: VisualLayer = {
        kind: "text",
        content: text.content,
        emphasis: text.emphasis ?? "normal",
      };
      const joined = appendWithJoiner(nextLayers, layer);
      nextLayers.length = 0;
      nextLayers.push(...joined);
    }

    setDraftId(undefined);
    setPublishedSlug(null);
    setGrade(null);
    setTitle(template.label);
    setAnswer(template.answer);
    setExplanation(template.explanation);
    setHints([...template.hints]);
    setTechniqueId(template.techniqueId);
    setDifficulty(template.difficulty);
    setLayout(template.layout);
    setLayers(nextLayers);
    setSelectedIndex(Math.max(0, nextLayers.length - 1));
    setStatusMessage(`Loaded “${template.label}” — tweak it, then continue.`);
    setStep("board");
  }

  function addPictogram(item: CatalogPictogram) {
    setLayers((prev) => {
      const next: VisualLayer = {
        kind: "pictogram",
        concept: item.concept,
        svg: item.svg,
        assetId: item.id,
        source: "catalog",
        emojiFallback: item.concept.slice(0, 2).toUpperCase() || "◆",
        role: "word-part",
      };
      const joined = appendWithJoiner(prev, next);
      setSelectedIndex(joined.length - 1);
      return joined;
    });
  }

  function addText() {
    setLayers((prev) => {
      const joined = appendWithJoiner(prev, {
        kind: "text",
        content: "WORD",
        emphasis: "normal",
      });
      setSelectedIndex(joined.length - 1);
      return joined;
    });
  }

  function moveLayer(from: number, to: number) {
    setLayers((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return next;
    });
    setSelectedIndex(to);
  }

  function removeLayer(index: number) {
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((current) => Math.max(0, Math.min(current, layers.length - 2)));
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
    setLayout(row.visual.layout);
    setLayers(row.visual.layers);
    setGrade(row.grade ?? null);
    setPublishedSlug(row.status === "approved" || row.status === "featured" ? row.slug : null);
    setStatusMessage(
      locked
        ? `Viewing published “${row.title || row.answer}”. Editing creates a new draft.`
        : `Loaded ${row.status} draft`
    );
    setStep("board");
  }

  function save(submit: boolean) {
    setError(null);
    setStatusMessage(null);
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
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          submission?: StudioSubmission;
          grade?: GradeSnapshot;
        };
        if (data.grade) setGrade(data.grade);
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
          setStatusMessage("You’re in! Your puzzle is live on your profile and in the daily lottery.");
          setStep("publish");
        } else {
          setStatusMessage("Draft saved. Jump to Publish when you’re ready for Eve’s check.");
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
      <div className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_-10%,#99f6e4_0%,transparent_55%),linear-gradient(180deg,#f8faf9,#eef5f3)]"
        />
        <div className="relative mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16">
          <p className="font-[family-name:var(--font-studio-display)] text-5xl tracking-tight text-teal-950 md:text-6xl">
            Studio
          </p>
          <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-teal-950">
            Make a rebus in three quiet steps.
          </h1>
          <p className="mt-3 text-teal-900/70 leading-7">
            Tap icons, write the answer, let Eve grade it. Good boards can fill a daily slot — and
            always live on your profile.
          </p>
          <ol className="mt-8 space-y-3 text-sm text-teal-950">
            {["Compose the board from fair catalog icons", "Add answer, hints, and a short mapping", "Publish into the lottery"].map(
              (line, i) => (
                <li className="flex gap-3" key={line}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-900 text-[11px] font-semibold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{line}</span>
                </li>
              )
            )}
          </ol>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href={isGuest ? "/signup?next=/studio" : "/login?next=/studio"}>
                {isGuest ? "Create a free account" : "Log in to open Studio"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/community">Browse player puzzles</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-shell min-h-[calc(100vh-4rem)] bg-[radial-gradient(1100px_520px_at_12%_-12%,#ccfbf1_0%,transparent_50%),linear-gradient(180deg,#f8faf9_0%,#eef5f3_100%)]">
      <div className="mx-auto max-w-5xl px-3 py-5 md:px-6 md:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-[family-name:var(--font-studio-display)] text-4xl tracking-tight text-teal-950 md:text-5xl">
              Studio
            </p>
            <p className="mt-1 text-sm text-teal-900/65">
              Three steps. Fair icons. Eve grades. Lottery optional.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.username ? (
              <Button asChild size="sm" variant="outline">
                <Link href={profilePathForUsername(user.username)}>Your profile</Link>
              </Button>
            ) : null}
            <Button onClick={resetBoard} size="sm" type="button" variant="ghost">
              New board
            </Button>
          </div>
        </header>

        <nav
          aria-label="Studio steps"
          className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-teal-900/10 bg-white/70 p-1.5 shadow-sm backdrop-blur"
        >
          {STEPS.map((item) => {
            const active = step === item.id;
            const locked =
              (item.id === "details" && !canDetails) || (item.id === "publish" && !canDetails);
            return (
              <button
                className={cn(
                  "rounded-xl px-2 py-2.5 text-left transition-colors md:px-3",
                  active ? "bg-teal-900 text-white shadow-sm" : "text-teal-950 hover:bg-teal-50",
                  locked && !active && "opacity-45"
                )}
                disabled={locked && !active}
                key={item.id}
                onClick={() => setStep(item.id)}
                type="button"
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className={cn("text-[11px]", active ? "text-teal-100" : "text-teal-900/55")}>
                  {item.hint}
                </span>
              </button>
            );
          })}
        </nav>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-teal-800/15 bg-teal-50/80 px-4 py-3 text-sm text-teal-900">
            {statusMessage}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {step === "board" ? (
          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-teal-900/10 bg-white/75 p-4 shadow-sm backdrop-blur md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-teal-950">Start from a template</h2>
                {!loaded ? <span className="text-xs text-muted-foreground">Loading icons…</span> : null}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {STUDIO_TEMPLATES.map((template) => (
                  <button
                    className="rounded-xl border border-teal-900/10 bg-teal-50/40 px-3 py-3 text-left transition-colors hover:border-teal-800/25 hover:bg-white"
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    type="button"
                  >
                    <span className="block font-medium text-teal-950">{template.label}</span>
                    <span className="mt-1 block text-xs text-teal-900/60">{template.blurb}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-teal-900/15 bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-5">
                {layers.length ? (
                  <PuzzleVisualBoard fallback={preview.unicodeFallback} size="large" visual={preview} />
                ) : (
                  <p className="max-w-xs text-center text-sm text-teal-900/45">
                    Your board preview appears here. Tap a template or pick icons on the right.
                  </p>
                )}
              </div>

              {layers.length ? (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {layers.map((layer, index) => (
                      <button
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          selectedIndex === index
                            ? "bg-teal-900 text-white"
                            : "bg-teal-50 text-teal-900 hover:bg-teal-100"
                        )}
                        key={`${layer.kind}-${index}`}
                        onClick={() => setSelectedIndex(index)}
                        type="button"
                      >
                        {layerLabel(layer)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-teal-900/60">
                    <button onClick={() => moveLayer(selectedIndex, selectedIndex - 1)} type="button">
                      Move left
                    </button>
                    <button onClick={() => moveLayer(selectedIndex, selectedIndex + 1)} type="button">
                      Move right
                    </button>
                    <button
                      className="text-rose-700"
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
                          className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
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
                          className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
                          onChange={(e) =>
                            setLayers((prev) =>
                              prev.map((layer, i) =>
                                i === selectedIndex && layer.kind === "text"
                                  ? {
                                      ...layer,
                                      emphasis: e.target.value as "normal" | "large" | "small",
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
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end">
                <Button disabled={!canDetails} onClick={() => setStep("details")} type="button">
                  Continue to answer
                </Button>
              </div>
            </div>

            <aside className="rounded-2xl border border-teal-900/10 bg-white/75 p-3 shadow-sm backdrop-blur">
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-900/65">
                Icon catalog
              </h2>
              <input
                className="mt-2 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm"
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Search icons…"
                value={catalogQuery}
              />
              <div className="mt-3 grid max-h-[420px] grid-cols-3 gap-2 overflow-auto pr-1">
                {filteredCatalog.map((item) => (
                  <button
                    className="flex flex-col items-center gap-1 rounded-lg border border-transparent bg-teal-50/50 p-2 text-[10px] text-teal-900 transition-colors hover:border-teal-800/20 hover:bg-white"
                    key={item.id}
                    onClick={() => addPictogram(item)}
                    title={`Add ${item.concept}`}
                    type="button"
                  >
                    <span
                      className="inline-flex h-9 w-9 items-center justify-center [&_svg]:h-6 [&_svg]:w-6"
                      dangerouslySetInnerHTML={{ __html: item.svg }}
                    />
                    <span className="w-full truncate text-center">{item.concept}</span>
                  </button>
                ))}
              </div>
            </aside>
          </section>
        ) : null}

        {step === "details" ? (
          <section className="mt-5 rounded-2xl border border-teal-900/10 bg-white/75 p-4 shadow-sm backdrop-blur md:p-6">
            <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex items-center justify-center rounded-xl bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-4">
                <PuzzleVisualBoard fallback={preview.unicodeFallback} size="medium" visual={preview} />
              </div>
              <div className="space-y-3">
                <label className="block text-sm">
                  <span className="text-teal-900/70">Answer players should type</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2.5 text-base"
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="e.g. sunflower"
                    value={answer}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-teal-900/70">How does the board become that answer?</span>
                  <textarea
                    className="mt-1 min-h-28 w-full rounded-lg border border-teal-900/15 px-3 py-2.5"
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Sun + flower reads as the compound sunflower…"
                    value={explanation}
                  />
                </label>
                <div className="grid gap-2 md:grid-cols-3">
                  {hints.map((hint, index) => (
                    <label className="block text-sm" key={`hint-${index}`}>
                      <span className="text-teal-900/70">Hint {index + 1}</span>
                      <input
                        className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
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
                <details className="rounded-xl border border-teal-900/10 bg-teal-50/30 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-teal-950">
                    Advanced (technique & difficulty)
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="block text-sm">
                      Technique
                      <select
                        className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
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
                        className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
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
                        className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={answer || "Optional"}
                        value={title}
                      />
                    </label>
                  </div>
                </details>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-between gap-2">
              <Button onClick={() => setStep("board")} type="button" variant="ghost">
                Back
              </Button>
              <Button disabled={!canPublish} onClick={() => setStep("publish")} type="button">
                Continue to publish
              </Button>
            </div>
          </section>
        ) : null}

        {step === "publish" ? (
          <section className="mt-5 rounded-2xl border border-teal-900/10 bg-white/75 p-4 shadow-sm backdrop-blur md:p-6">
            <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="flex flex-col items-center justify-center rounded-xl bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-4">
                <PuzzleVisualBoard fallback={preview.unicodeFallback} size="medium" visual={preview} />
                <p className="mt-3 text-center text-sm font-medium text-teal-950">
                  {answer || "Your answer"}
                </p>
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-teal-950">
                  Ready for Eve’s check?
                </h2>
                <p className="mt-1 text-sm text-teal-900/65">
                  Passing boards go on your public profile and into the daily lottery. Nothing posts
                  until you click Publish.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button disabled={pending || !canPublish} onClick={() => save(false)} type="button" variant="outline">
                    {pending ? "Checking…" : "Preview grade"}
                  </Button>
                  <Button disabled={pending || !canPublish} onClick={() => save(true)} type="button">
                    {pending ? "Publishing…" : "Publish puzzle"}
                  </Button>
                </div>

                {grade ? (
                  <div
                    className={cn(
                      "mt-5 rounded-xl border px-4 py-3 text-sm",
                      grade.ok
                        ? "border-teal-800/20 bg-teal-50 text-teal-950"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    )}
                  >
                    <p className="font-medium">
                      {grade.ok ? "Looks fair to publish" : "Needs a quick fix"}
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
                      <p className="mt-2 opacity-80">No blocking issues.</p>
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

            <div className="mt-8 border-t border-teal-900/10 pt-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-teal-950">Your puzzles</h3>
                <Link className="text-sm text-teal-800 hover:underline" href="/community">
                  Community →
                </Link>
              </div>
              {submissions.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Nothing published yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-teal-900/10 rounded-xl border border-teal-900/10">
                  {submissions.slice(0, 8).map((row) => (
                    <li className="flex items-center justify-between gap-3 px-3 py-2.5" key={row.id}>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => loadSubmission(row)}
                        type="button"
                      >
                        <span className="block truncate font-medium text-teal-950">
                          {row.title || row.answer}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.12em] text-teal-900/55">
                          {row.status}
                          {row.featuredOn ? ` · daily ${row.featuredOn}` : ""}
                        </span>
                      </button>
                      {row.status === "approved" || row.status === "featured" ? (
                        <Link
                          className="shrink-0 text-sm text-teal-800 hover:underline"
                          href={communityPuzzlePath(row.slug)}
                        >
                          Open
                        </Link>
                      ) : (
                        <button
                          className="shrink-0 text-sm text-teal-800 hover:underline"
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
