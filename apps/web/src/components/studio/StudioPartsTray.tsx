"use client";

import { Search, Shapes, Sigma, Sparkles, Type } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { labelFromSlug } from "@/lib/typography";
import type { StudioMark } from "@/lib/ugc/studio-marks";
import { cn } from "@/lib/utils";

export type CatalogPictogram = { id: string; concept: string; svg: string };
export type AiQuota = { used: number; limit: number; remaining: number };
export type TextEmphasis = "normal" | "large" | "small" | "strike" | "tiny";
export type RecentPart = { kind: "icon"; id: string } | { kind: "mark"; id: string };

type TrayTab = "icons" | "marks" | "text" | "ai";

const TABS: Array<{ id: TrayTab; label: string; icon: typeof Shapes }> = [
  { id: "icons", label: "Icons", icon: Shapes },
  { id: "marks", label: "Marks", icon: Sigma },
  { id: "text", label: "Words", icon: Type },
  { id: "ai", label: "AI", icon: Sparkles },
];

export const TEXT_SIZES: Array<{ id: TextEmphasis; label: string }> = [
  { id: "tiny", label: "Tiny" },
  { id: "small", label: "Small" },
  { id: "normal", label: "Normal" },
  { id: "large", label: "Big" },
  { id: "strike", label: "Struck" },
];

/** On phones the tiles scroll sideways in two rows so the stage stays in view; on desktop they stack. */
const TILE_GRID =
  "grid auto-cols-[4.75rem] grid-flow-col grid-rows-2 gap-1.5 overflow-x-auto overscroll-x-contain pb-1 lg:max-h-[min(52vh,30rem)] lg:auto-cols-auto lg:grid-flow-row lg:grid-cols-3 lg:grid-rows-none lg:overflow-y-auto lg:overflow-x-visible lg:pr-1 lg:pb-0";

type StudioPartsTrayProps = {
  loaded: boolean;
  pictograms: CatalogPictogram[];
  marks: StudioMark[];
  recent: RecentPart[];
  pieceCount: number;
  lastAdded: string | null;
  aiQuota: AiQuota;
  aiGenerating: boolean;
  onAddPictogram: (item: CatalogPictogram) => void;
  onAddMark: (mark: StudioMark) => void;
  onAddText: (content: string, emphasis: TextEmphasis) => void;
  onGenerateAi: (concept: string) => Promise<boolean>;
  className?: string;
};

/**
 * The parts tray: everything a player can drop on the stage, sorted into
 * drawers like a level editor's palette, with recently used parts up top.
 */
export function StudioPartsTray({
  loaded,
  pictograms,
  marks,
  recent,
  pieceCount,
  lastAdded,
  aiQuota,
  aiGenerating,
  onAddPictogram,
  onAddMark,
  onAddText,
  onGenerateAi,
  className,
}: StudioPartsTrayProps) {
  const [tab, setTab] = useState<TrayTab>("icons");
  const [query, setQuery] = useState("");
  const [word, setWord] = useState("");
  const [wordSize, setWordSize] = useState<TextEmphasis>("normal");
  const [aiPrompt, setAiPrompt] = useState("");

  const filteredIcons = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pictograms;
    // Labels show "Alarm clock", so match the spaced form as well as the slug.
    return pictograms.filter(
      (p) =>
        p.concept.includes(q) ||
        p.id.includes(q) ||
        labelFromSlug(p.concept).toLowerCase().includes(q)
    );
  }, [query, pictograms]);

  const filteredMarks = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return marks;
    return marks.filter((m) => m.label.toLowerCase().includes(q) || m.value.includes(q));
  }, [query, marks]);

  const recentTiles = recent
    .map((part) =>
      part.kind === "icon"
        ? { part, icon: pictograms.find((p) => p.id === part.id) }
        : { part, mark: marks.find((m) => m.id === part.id) }
    )
    .filter((entry) => ("icon" in entry ? entry.icon : entry.mark));

  const submitWord = () => {
    const content = word.trim().slice(0, 40);
    if (!content) return;
    onAddText(content, wordSize);
    setWord("");
  };

  const submitAi = async () => {
    const ok = await onGenerateAi(aiPrompt.trim());
    if (ok) setAiPrompt("");
  };

  const searchable = tab === "icons" || tab === "marks";

  return (
    <section aria-label="Parts" className={cn("flex min-w-0 flex-col gap-2.5", className)}>
      <div className="studio-toolbar" role="tablist" aria-label="Part drawers">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            aria-controls="studio-tray-panel"
            aria-selected={tab === id}
            className="studio-tool h-12 flex-1 flex-col gap-0.5 px-1 text-xs"
            key={id}
            onClick={() => setTab(id)}
            role="tab"
            type="button"
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-col gap-2.5" id="studio-tray-panel" role="tabpanel">
        {searchable ? (
          <label className="relative block">
            <span className="sr-only">{tab === "icons" ? "Search icons" : "Search marks"}</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
            />
            <input
              className="h-10 w-full rounded-lg border border-border bg-card pr-3 pl-9 text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm"
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === "icons" ? "Search icons…" : "Search marks…"}
              type="search"
              value={query}
            />
          </label>
        ) : null}

        {searchable && !query && recentTiles.length ? (
          <div>
            <p className="eyebrow mb-1.5">Recent</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {recentTiles.map((entry) =>
                "icon" in entry && entry.icon ? (
                  <button
                    aria-label={`Add ${labelFromSlug(entry.icon.concept)} again`}
                    className="studio-tile size-11 shrink-0 p-0 [&_svg]:size-5"
                    dangerouslySetInnerHTML={{ __html: entry.icon.svg }}
                    key={`r-icon-${entry.icon.id}`}
                    onClick={() => onAddPictogram(entry.icon!)}
                    type="button"
                  />
                ) : "mark" in entry && entry.mark ? (
                  <button
                    aria-label={`Add ${entry.mark.label} again`}
                    className="studio-tile size-11 shrink-0 p-0 font-semibold text-base text-foreground"
                    key={`r-mark-${entry.mark.id}`}
                    onClick={() => onAddMark(entry.mark!)}
                    type="button"
                  >
                    {entry.mark.value}
                  </button>
                ) : null
              )}
            </div>
          </div>
        ) : null}

        {tab === "icons" ? (
          !loaded ? (
            <p className="py-6 text-center text-muted-foreground text-sm">Loading icons…</p>
          ) : filteredIcons.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground text-sm">
              No icon called “{query.trim()}”. Try the AI drawer to draw one.
            </p>
          ) : (
            <div className={TILE_GRID}>
              {filteredIcons.map((item) => (
                <button
                  className="studio-tile"
                  key={item.id}
                  onClick={() => onAddPictogram(item)}
                  title={`Add ${labelFromSlug(item.concept)}`}
                  type="button"
                >
                  <span
                    className="inline-flex size-8 items-center justify-center text-foreground [&_svg]:size-6"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  <span className="w-full truncate text-center">{labelFromSlug(item.concept)}</span>
                </button>
              ))}
            </div>
          )
        ) : null}

        {tab === "marks" ? (
          <div className={TILE_GRID}>
            {filteredMarks.map((mark) => (
              <button
                className="studio-tile"
                key={mark.id}
                onClick={() => onAddMark(mark)}
                title={`Add ${mark.label}`}
                type="button"
              >
                <span className="inline-flex size-8 items-center justify-center font-semibold text-foreground text-lg">
                  {mark.value}
                </span>
                <span className="w-full truncate text-center">{mark.label}</span>
              </button>
            ))}
          </div>
        ) : null}

        {tab === "text" ? (
          <form
            className="space-y-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              submitWord();
            }}
          >
            <label className="block text-sm">
              <span className="text-muted-foreground">Word or letters</span>
              <input
                autoCapitalize="characters"
                autoComplete="off"
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 font-semibold text-base uppercase tracking-wide focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm"
                maxLength={40}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. DEAL"
                spellCheck={false}
                value={word}
              />
            </label>
            <fieldset>
              <legend className="text-muted-foreground text-sm">Size</legend>
              <div className="mt-1 flex flex-wrap gap-1">
                {TEXT_SIZES.map((size) => (
                  <button
                    aria-pressed={wordSize === size.id}
                    className="studio-tool h-8 border border-border text-xs"
                    key={size.id}
                    onClick={() => setWordSize(size.id)}
                    type="button"
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Button className="w-full" disabled={!word.trim()} type="submit">
              Drop on stage
            </Button>
            <p className="text-muted-foreground text-xs leading-5">
              Size and position carry meaning: a big DEAL reads as “big deal”.
            </p>
          </form>
        ) : null}

        {tab === "ai" ? (
          <form
            className="space-y-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitAi();
            }}
          >
            <p className="text-muted-foreground text-xs leading-5">
              Draw a custom tile when the catalog doesn’t have what you need. {aiQuota.remaining} of{" "}
              {aiQuota.limit} left on your account.
            </p>
            <label className="block text-sm">
              <span className="text-muted-foreground">What should it look like?</span>
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm"
                disabled={aiGenerating || aiQuota.remaining <= 0}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. rusty key, tiny bee…"
                value={aiPrompt}
              />
            </label>
            <Button
              className="w-full"
              disabled={aiGenerating || aiQuota.remaining <= 0 || aiPrompt.trim().length < 2}
              type="submit"
            >
              {aiGenerating
                ? "Drawing…"
                : aiQuota.remaining <= 0
                  ? "No drawings left"
                  : `Draw it (${aiQuota.remaining} left)`}
            </Button>
          </form>
        ) : null}

        <p aria-live="polite" className="min-h-5 truncate text-muted-foreground text-xs">
          {lastAdded
            ? `Added ${lastAdded} · ${pieceCount} ${pieceCount === 1 ? "piece" : "pieces"} on the board`
            : searchable
              ? "Tap a part to drop it on the stage."
              : null}
        </p>
      </div>
    </section>
  );
}
