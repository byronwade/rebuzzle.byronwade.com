"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AppLink as Link } from "@/components/AppLink";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/AuthProvider";
import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import { INK_PICTOGRAM_STYLE_ID } from "@/ai/puzzle-agent/visual/style";
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
  techniqueId: string;
  difficulty: number;
  rebusPuzzle: string;
  visual: PuzzleVisual;
  grade?: GradeSnapshot & { gradedAt?: string };
  puzzleId?: string;
  featuredOn?: string;
};

const LAYOUTS: Array<PuzzleVisual["layout"]> = ["row", "stack", "grid", "overlay"];
const EMPHASIS = ["normal", "large", "small", "strike", "stacked", "tiny"] as const;

function emptyVisual(): PuzzleVisual {
  return {
    styleId: INK_PICTOGRAM_STYLE_ID,
    mode: "composed",
    layout: "row",
    layers: [],
    unicodeFallback: "◆",
  };
}

export function PuzzleStudio() {
  const { isAuthenticated, isLoading } = useAuth();
  const [pending, startTransition] = useTransition();
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo<PuzzleVisual>(
    () => ({
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
            return "🖼️";
          })
          .join(" ")
          .trim() || "◆",
    }),
    [layout, layers]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
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
          if (data.techniques[0] && !techniqueId) setTechniqueId(data.techniques[0].id);
        }
        if (listRes.ok) {
          const data = (await listRes.json()) as { submissions: StudioSubmission[] };
          setSubmissions(data.submissions);
        }
      } catch {
        setError("Could not load Studio catalog");
      }
    })();
  }, [isAuthenticated, techniqueId]);

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return pictograms.slice(0, 48);
    return pictograms.filter((p) => p.concept.includes(q) || p.id.includes(q)).slice(0, 48);
  }, [catalogQuery, pictograms]);

  function addPictogram(item: CatalogPictogram) {
    setLayers((prev) => [
      ...prev,
      {
        kind: "pictogram",
        concept: item.concept,
        svg: item.svg,
        assetId: item.id,
        source: "catalog",
        emojiFallback: item.concept.slice(0, 2).toUpperCase() || "◆",
        role: "word-part",
      },
    ]);
    setSelectedIndex(layers.length);
  }

  function addText() {
    setLayers((prev) => [...prev, { kind: "text", content: "WORD", emphasis: "normal" }]);
    setSelectedIndex(layers.length);
  }

  function addOperator(symbol = "+") {
    setLayers((prev) => [...prev, { kind: "operator", symbol }]);
    setSelectedIndex(layers.length);
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
    setSelectedIndex(0);
  }

  function loadSubmission(row: StudioSubmission) {
    setDraftId(row.id);
    setTitle(row.title ?? "");
    setAnswer(row.answer);
    setExplanation("");
    setHints(["", "", ""]);
    setTechniqueId(row.techniqueId);
    setDifficulty(row.difficulty);
    setLayout(row.visual.layout);
    setLayers(row.visual.layers);
    setGrade(row.grade ?? null);
    setStatusMessage(`Loaded ${row.status} draft`);
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
            title,
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
          setDraftId(data.submission.id);
          setLayers(data.submission.visual.layers);
          setLayout(data.submission.visual.layout);
        }
        if (!response.ok) {
          setError(data.error || "Save failed");
          return;
        }
        setStatusMessage(
          submit
            ? "Passed AI checks — your puzzle entered the daily lottery and is playable on your profile."
            : "Draft saved. Run AI checks when you are ready to submit."
        );
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
    return <div className="mx-auto max-w-6xl px-4 py-16 text-muted-foreground">Loading Studio…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16">
        <p className="font-[family-name:var(--font-studio-display)] text-5xl tracking-tight text-teal-950">
          Studio
        </p>
        <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight">
          Build a rebus the way you sketch an interface.
        </h1>
        <p className="mt-3 text-muted-foreground leading-7">
          Sign in to compose boards with catalog icons, get graded by Eve, and enter the daily
          lottery.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/login?next=/studio">Log in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/signup?next=/studio">Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  const selected = layers[selectedIndex];

  return (
    <div className="studio-shell min-h-[calc(100vh-4rem)] bg-[radial-gradient(1200px_600px_at_10%_-10%,#ccfbf1_0%,transparent_55%),linear-gradient(180deg,#f8faf9_0%,#eef5f3_100%)]">
      <div className="mx-auto grid max-w-[1400px] gap-4 px-3 py-4 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:px-6">
        {/* Left: layers + drafts */}
        <aside className="rounded-2xl border border-teal-900/10 bg-white/80 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-900/70">
              Layers
            </h2>
            <div className="flex gap-1">
              <Button onClick={addText} size="sm" type="button" variant="ghost">
                Text
              </Button>
              <Button onClick={() => addOperator("+")} size="sm" type="button" variant="ghost">
                +
              </Button>
            </div>
          </div>
          <ul className="mt-3 space-y-1">
            {layers.length === 0 ? (
              <li className="rounded-lg bg-teal-50/80 px-3 py-4 text-sm text-teal-900/70">
                Add pictograms from the catalog to start composing.
              </li>
            ) : (
              layers.map((layer, index) => (
                <li key={`${layer.kind}-${index}`}>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      selectedIndex === index
                        ? "bg-teal-900 text-teal-50"
                        : "hover:bg-teal-50 text-teal-950"
                    )}
                    onClick={() => setSelectedIndex(index)}
                    type="button"
                  >
                    <span className="truncate">
                      {layer.kind === "pictogram"
                        ? layer.concept
                        : layer.kind === "text"
                          ? layer.content
                          : layer.kind === "operator"
                            ? layer.symbol
                            : layer.concept || "image"}
                    </span>
                    <span className="ml-2 text-[10px] uppercase opacity-70">{layer.kind}</span>
                  </button>
                  <div className="mt-1 flex gap-1 px-1">
                    <button
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => moveLayer(index, index - 1)}
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={() => moveLayer(index, index + 1)}
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="text-[11px] text-rose-700 hover:text-rose-900"
                      onClick={() => removeLayer(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          <h2 className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-teal-900/70">
            Your puzzles
          </h2>
          <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
            {submissions.map((row) => (
              <li key={row.id}>
                <button
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-teal-50"
                  onClick={() => loadSubmission(row)}
                  type="button"
                >
                  <span className="block truncate font-medium">{row.title || row.answer}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {row.status}
                    {row.featuredOn ? ` · featured ${row.featuredOn}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Center: canvas */}
        <section className="rounded-2xl border border-teal-900/10 bg-white/70 p-4 shadow-sm backdrop-blur md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-studio-display)] text-4xl leading-none tracking-tight text-teal-950 md:text-5xl">
                Studio
              </p>
              <p className="mt-2 max-w-md text-sm text-teal-900/70">
                Compose the board. Eve grades fairness. Lottery winners become tomorrow’s fillers.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {LAYOUTS.map((mode) => (
                <button
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    layout === mode
                      ? "bg-teal-900 text-white"
                      : "bg-teal-50 text-teal-900 hover:bg-teal-100"
                  )}
                  key={mode}
                  onClick={() => setLayout(mode)}
                  type="button"
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-teal-900/15 bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-6">
            {layers.length ? (
              <PuzzleVisualBoard fallback={preview.unicodeFallback} size="large" visual={preview} />
            ) : (
              <p className="text-sm text-teal-900/50">Live preview appears here</p>
            )}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-teal-900/70">Answer</span>
              <input
                className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="e.g. sunflower"
                value={answer}
              />
            </label>
            <label className="block text-sm">
              <span className="text-teal-900/70">Title (optional)</span>
              <input
                className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Shown on your profile"
                value={title}
              />
            </label>
          </div>

          <label className="mt-3 block text-sm">
            <span className="text-teal-900/70">Explanation</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="How the board maps to the answer…"
              value={explanation}
            />
          </label>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {hints.map((hint, index) => (
              <label className="block text-sm" key={`hint-${index}`}>
                <span className="text-teal-900/70">Hint {index + 1}</span>
                <input
                  className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
                  onChange={(e) =>
                    setHints((prev) => prev.map((value, i) => (i === index ? e.target.value : value)))
                  }
                  value={hint}
                />
              </label>
            ))}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="text-teal-900/70">Technique</span>
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
              <span className="text-teal-900/70">Difficulty (1–10)</span>
              <input
                className="mt-1 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2"
                max={10}
                min={1}
                onChange={(e) => setDifficulty(Number(e.target.value) || 5)}
                type="number"
                value={difficulty}
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={pending} onClick={() => save(false)} type="button" variant="outline">
              {pending ? "Saving…" : "Save draft + preview grade"}
            </Button>
            <Button disabled={pending} onClick={() => save(true)} type="button">
              {pending ? "Submitting…" : "Submit for AI checks"}
            </Button>
            <Button
              onClick={() => {
                setDraftId(undefined);
                setTitle("");
                setAnswer("");
                setExplanation("");
                setHints(["", "", ""]);
                setLayers([]);
                setGrade(null);
                setStatusMessage(null);
              }}
              type="button"
              variant="ghost"
            >
              New board
            </Button>
          </div>

          {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          {statusMessage ? <p className="mt-3 text-sm text-teal-800">{statusMessage}</p> : null}
          {grade ? (
            <div className="mt-4 rounded-xl border border-teal-900/10 bg-teal-50/60 p-4 text-sm">
              <p className="font-medium text-teal-950">
                AI grade · {grade.ok ? "Pass" : "Needs work"} · quality {grade.score} · fun{" "}
                {grade.funScore}
              </p>
              {grade.issues.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-teal-900/80">
                  {grade.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-teal-900/70">No blocking issues.</p>
              )}
            </div>
          ) : null}
        </section>

        {/* Right: catalog + inspector */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-3 shadow-sm backdrop-blur">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-900/70">
              Catalog
            </h2>
            <input
              className="mt-2 w-full rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm"
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search icons…"
              value={catalogQuery}
            />
            <div className="mt-3 grid max-h-[340px] grid-cols-3 gap-2 overflow-auto">
              {filteredCatalog.map((item) => (
                <button
                  className="flex flex-col items-center gap-1 rounded-lg border border-transparent bg-teal-50/50 p-2 text-[10px] text-teal-900 transition-colors hover:border-teal-800/20 hover:bg-white"
                  key={item.id}
                  onClick={() => addPictogram(item)}
                  title={item.concept}
                  type="button"
                >
                  <span
                    className="inline-flex h-10 w-10 items-center justify-center [&_svg]:h-7 [&_svg]:w-7"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  <span className="w-full truncate text-center">{item.concept}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-3 shadow-sm backdrop-blur">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-900/70">
              Inspector
            </h2>
            {!selected ? (
              <p className="mt-3 text-sm text-muted-foreground">Select a layer to edit properties.</p>
            ) : selected.kind === "text" ? (
              <div className="mt-3 space-y-2">
                <label className="block text-sm">
                  Content
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
                <label className="block text-sm">
                  Emphasis
                  <select
                    className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
                    onChange={(e) =>
                      setLayers((prev) =>
                        prev.map((layer, i) =>
                          i === selectedIndex && layer.kind === "text"
                            ? {
                                ...layer,
                                emphasis: e.target.value as (typeof EMPHASIS)[number],
                              }
                            : layer
                        )
                      )
                    }
                    value={selected.emphasis ?? "normal"}
                  >
                    {EMPHASIS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : selected.kind === "operator" ? (
              <label className="mt-3 block text-sm">
                Symbol
                <input
                  className="mt-1 w-full rounded-lg border border-teal-900/15 px-3 py-2"
                  maxLength={4}
                  onChange={(e) =>
                    setLayers((prev) =>
                      prev.map((layer, i) =>
                        i === selectedIndex && layer.kind === "operator"
                          ? { ...layer, symbol: e.target.value || "+" }
                          : layer
                      )
                    )
                  }
                  value={selected.symbol}
                />
              </label>
            ) : (
              <p className="mt-3 text-sm text-teal-900/80">
                Pictogram <strong>{selected.kind === "pictogram" ? selected.concept : ""}</strong>{" "}
                from the reviewed catalog.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
