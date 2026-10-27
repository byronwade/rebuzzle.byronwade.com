"use client";

import { Play, Plus } from "lucide-react";
import type { PuzzleVisual } from "@/ai/puzzle-agent/visual/composition";
import { AppLink as Link } from "@/components/AppLink";
import { PageHeader } from "@/components/PageHeader";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { Button } from "@/components/ui/button";
import { communityPuzzlePath, profilePathForUsername } from "@/lib/ugc/slug";
import type { StudioTemplate } from "@/lib/ugc/studio-templates";
import { cn } from "@/lib/utils";

export type WorkshopLevel = {
  id: string;
  slug: string;
  status: string;
  statusLabel: string;
  name: string;
  featuredOn?: string;
  visual: PuzzleVisual;
};

type StudioWorkshopProps = {
  username?: string;
  loaded: boolean;
  draft: { name: string; visual: PuzzleVisual; pieces: number } | null;
  templates: Array<{ template: StudioTemplate; visual: PuzzleVisual }>;
  levels: WorkshopLevel[];
  onNew: () => void;
  onContinue: () => void;
  onTemplate: (template: StudioTemplate) => void;
  onOpenLevel: (id: string) => void;
};

const STATUS_TONE: Record<string, string> = {
  approved: "bg-success/15 text-success",
  featured: "bg-brand text-brand-foreground",
  pending_grade: "bg-warning/15 text-warning",
  rejected: "bg-destructive/15 text-destructive",
};

function Thumb({ visual, children }: { visual: PuzzleVisual; children?: React.ReactNode }) {
  return (
    <div className="studio-level-thumb">
      {visual.layers.length ? (
        <div className="pointer-events-none origin-center scale-[0.8]">
          <PuzzleVisualBoard fallback={visual.unicodeFallback} size="small" visual={visual} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

/**
 * The Studio's front door, laid out like a maker's level select: pick up your
 * save, start blank, remix a starter, or open one of your own boards.
 */
export function StudioWorkshop({
  username,
  loaded,
  draft,
  templates,
  levels,
  onNew,
  onContinue,
  onTemplate,
  onOpenLevel,
}: StudioWorkshopProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <PageHeader
        actions={
          username ? (
            <Button asChild size="sm" variant="outline">
              <Link href={profilePathForUsername(username)}>Your profile</Link>
            </Button>
          ) : null
        }
        className="mb-8 md:mb-10"
        description="Build a board from parts, play it yourself, then Eve checks it's fair. Good ones can land in the daily puzzle."
        eyebrow="Studio"
        title="Your workshop."
      />

      <section aria-labelledby="studio-start">
        <h2 className="sr-only" id="studio-start">
          Start a board
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {draft ? (
            <button
              className="studio-level-card ring-2 ring-brand/60"
              onClick={onContinue}
              type="button"
            >
              <Thumb visual={draft.visual}>
                <span className="absolute top-2 left-2 rounded-full bg-brand px-2 py-0.5 font-medium text-brand-foreground text-xs">
                  Saved
                </span>
              </Thumb>
              <span className="flex items-center justify-between gap-2 p-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium text-sm">{draft.name}</span>
                  <span className="block text-muted-foreground text-xs">
                    {draft.pieces} {draft.pieces === 1 ? "piece" : "pieces"} · keep going
                  </span>
                </span>
                <Play aria-hidden className="size-4 shrink-0 text-brand" />
              </span>
            </button>
          ) : null}

          <button className="studio-level-card" onClick={onNew} type="button">
            <div className="studio-level-thumb">
              <span className="studio-empty-mark size-12">
                <Plus aria-hidden className="size-5" />
              </span>
            </div>
            <span className="p-3">
              <span className="block font-medium text-sm">Blank board</span>
              <span className="block text-muted-foreground text-xs">Start from nothing</span>
            </span>
          </button>

          {templates.map(({ template, visual }) => (
            <button
              className="studio-level-card"
              disabled={!loaded}
              key={template.id}
              onClick={() => onTemplate(template)}
              type="button"
            >
              <Thumb visual={visual}>
                <span className="absolute top-2 left-2 rounded-full border border-border bg-card px-2 py-0.5 font-medium text-muted-foreground text-xs">
                  Starter
                </span>
              </Thumb>
              <span className="p-3">
                <span className="block font-medium text-sm">{template.label}</span>
                <span className="block text-muted-foreground text-xs leading-5">
                  {template.blurb}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="studio-levels" className="mt-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-lg tracking-[-0.02em]" id="studio-levels">
              Your boards
            </h2>
            <p className="text-muted-foreground text-sm">
              {levels.length
                ? `${levels.length} made so far`
                : "Boards you save or publish show up here."}
            </p>
          </div>
          <Link
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            href="/community"
          >
            Community →
          </Link>
        </div>

        {!loaded ? (
          <p className="mt-4 text-muted-foreground text-sm">Loading your boards…</p>
        ) : levels.length ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {levels.map((level) => {
              const live = level.status === "approved" || level.status === "featured";
              return (
                <li className="studio-level-card" key={level.id}>
                  <button
                    className="flex flex-col text-left focus-ring"
                    onClick={() => onOpenLevel(level.id)}
                    type="button"
                  >
                    <Thumb visual={level.visual}>
                      <span
                        className={cn(
                          "absolute top-2 left-2 rounded-full px-2 py-0.5 font-medium text-xs",
                          STATUS_TONE[level.status] ??
                            "border border-border bg-card text-muted-foreground"
                        )}
                      >
                        {level.statusLabel}
                      </span>
                    </Thumb>
                    <span className="block px-3 pt-3">
                      <span className="block truncate font-medium text-sm">{level.name}</span>
                      <span className="block text-muted-foreground text-xs">
                        {level.featuredOn ? `Daily ${level.featuredOn}` : live ? "Live" : "Edit"}
                      </span>
                    </span>
                  </button>
                  <span className="flex gap-3 px-3 pt-1 pb-3 text-xs">
                    {live ? (
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={communityPuzzlePath(level.slug)}
                      >
                        Play it
                      </Link>
                    ) : (
                      <span className="text-subtle">Not live yet</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl border border-border border-dashed px-4 py-8 text-center">
            <p className="font-medium text-sm">No boards yet</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Start blank or open a starter above. Your first board takes about two minutes.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
