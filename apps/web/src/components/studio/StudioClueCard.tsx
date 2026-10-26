"use client";

import { cn } from "@/lib/utils";

export type TechniqueOption = { id: string; name: string; summary: string };

const FIELD =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-base focus-ring transition-[border-color,box-shadow] focus-visible:border-ring md:text-sm";

type StudioClueCardProps = {
  answer: string;
  explanation: string;
  hints: string[];
  techniqueId: string;
  difficulty: number;
  title: string;
  techniques: TechniqueOption[];
  minExplanationLength: number;
  onAnswer: (value: string) => void;
  onExplanation: (value: string) => void;
  onHint: (index: number, value: string) => void;
  onTechnique: (value: string) => void;
  onDifficulty: (value: number) => void;
  onTitle: (value: string) => void;
  className?: string;
};

/**
 * The clue card: the solution side of the board. Answer, how it reads, three
 * hints that escalate, then the tuning a level editor tucks under "settings".
 */
export function StudioClueCard({
  answer,
  explanation,
  hints,
  techniqueId,
  difficulty,
  title,
  techniques,
  minExplanationLength,
  onAnswer,
  onExplanation,
  onHint,
  onTechnique,
  onDifficulty,
  onTitle,
  className,
}: StudioClueCardProps) {
  const explanationShortBy = Math.max(0, minExplanationLength - explanation.trim().length);
  const technique = techniques.find((t) => t.id === techniqueId);

  return (
    <section
      aria-labelledby="studio-clue-heading"
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <h2 className="font-semibold text-sm tracking-[-0.01em]" id="studio-clue-heading">
        Clue card
      </h2>
      <p className="mt-0.5 text-muted-foreground text-xs">What the board spells, and how.</p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Answer players should type</span>
          <input
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className={cn(FIELD, "h-11 font-semibold text-base")}
            onChange={(e) => onAnswer(e.target.value)}
            placeholder="e.g. sunflower"
            spellCheck={false}
            value={answer}
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted-foreground">How does the board become that answer?</span>
          <textarea
            className={cn(FIELD, "min-h-24 py-2.5")}
            onChange={(e) => onExplanation(e.target.value)}
            placeholder="Sun + flower reads as the compound sunflower…"
            value={explanation}
          />
          <span className="mt-1 block text-subtle text-xs">
            Shown to players after they solve it.
            {explanationShortBy > 0
              ? ` At least ${minExplanationLength} characters, ${explanationShortBy} to go.`
              : null}
          </span>
        </label>

        <fieldset>
          <legend className="text-muted-foreground text-sm">Hints, gentle to giveaway</legend>
          <div className="mt-1 space-y-1.5">
            {hints.map((hint, index) => (
              <label className="flex items-center gap-2" key={`hint-${index}`}>
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-inset font-mono text-subtle text-xs tabular-nums"
                >
                  {index + 1}
                </span>
                <span className="sr-only">Hint {index + 1}</span>
                <input
                  className={cn(FIELD, "mt-0")}
                  onChange={(e) => onHint(index, e.target.value)}
                  value={hint}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <details className="group rounded-lg border border-border bg-inset">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 font-medium text-sm">
            Settings
            <span className="font-normal text-muted-foreground text-xs">
              {technique?.name ?? "Technique"} · difficulty {difficulty}
            </span>
          </summary>
          <div className="space-y-3 border-border border-t p-3">
            <label className="block text-sm">
              Technique
              <select
                className={FIELD}
                onChange={(e) => onTechnique(e.target.value)}
                value={techniqueId}
              >
                {techniques.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
              {technique?.summary ? (
                <span className="mt-1 block text-subtle text-xs leading-5">
                  {technique.summary}
                </span>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="flex items-center justify-between">
                Difficulty
                <span className="font-mono text-muted-foreground text-xs tabular-nums">
                  {difficulty}/10
                </span>
              </span>
              <input
                className="mt-2 w-full accent-[hsl(var(--brand))]"
                max={10}
                min={1}
                onChange={(e) => onDifficulty(Number(e.target.value) || 5)}
                type="range"
                value={difficulty}
              />
            </label>
            <label className="block text-sm">
              Title on your profile
              <input
                className={FIELD}
                onChange={(e) => onTitle(e.target.value)}
                placeholder={answer || "Optional"}
                value={title}
              />
            </label>
          </div>
        </details>
      </div>
    </section>
  );
}
