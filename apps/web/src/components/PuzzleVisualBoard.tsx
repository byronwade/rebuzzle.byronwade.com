"use client";

import { type CSSProperties, useMemo } from "react";
import { sanitizePictogramSvg } from "@/ai/puzzle-agent/visual/sanitize-svg";
import type { PuzzleVisual, PuzzleVisualLayer } from "@/lib/gameSettings";
import { cn } from "@/lib/utils";

type BoardSize = "small" | "medium" | "large";

interface PuzzleVisualBoardProps {
  visual: PuzzleVisual;
  /** Unicode fallback when layers can't render */
  fallback: string;
  size?: BoardSize;
  className?: string;
  /** Compact keyboard-aware strip */
  compact?: boolean;
}

const SIZE_PX: Record<BoardSize, { tile: number; text: string; gap: string }> = {
  small: { tile: 36, text: "text-lg", gap: "gap-1.5" },
  medium: { tile: 52, text: "text-2xl", gap: "gap-2" },
  large: { tile: 72, text: "text-[clamp(1.75rem,5vw,2.75rem)]", gap: "gap-2.5 sm:gap-3" },
};

function textEmphasisClass(emphasis?: string): string {
  switch (emphasis) {
    case "large":
      return "text-[1.35em] font-bold tracking-tight";
    case "small":
      return "text-[0.72em] font-semibold tracking-wide";
    case "tiny":
      return "text-[0.55em] font-semibold tracking-[0.12em] uppercase opacity-90";
    case "strike":
      return "line-through decoration-[0.12em] decoration-[var(--rb-strike,#b23a2d)] font-bold";
    case "stacked":
      return "font-bold leading-[0.95] tracking-[0.08em]";
    default:
      return "font-semibold tracking-tight";
  }
}

function PictogramTile({
  layer,
  sizePx,
  index,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "pictogram" }>;
  sizePx: number;
  index: number;
}) {
  const safeSvg = useMemo(() => (layer.svg ? sanitizePictogramSvg(layer.svg) : null), [layer.svg]);

  if (safeSvg) {
    return (
      <span
        className="puzzle-pictogram inline-flex shrink-0 items-center justify-center animate-in fade-in zoom-in-95 duration-500 fill-mode-both motion-reduce:animate-none"
        style={{
          width: sizePx,
          height: sizePx,
          animationDelay: `${Math.min(index, 6) * 45}ms`,
        }}
        role="img"
        aria-label={layer.concept}
        // Sanitized Ink Pictogram SVG only
        dangerouslySetInnerHTML={{ __html: safeSvg }}
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center leading-none"
      style={{ width: sizePx, height: sizePx, fontSize: sizePx * 0.72 }}
      role="img"
      aria-label={layer.concept}
    >
      {layer.emojiFallback}
    </span>
  );
}

function TextTile({
  layer,
  sizeClass,
  index,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "text" }>;
  sizeClass: string;
  index: number;
}) {
  const stacked = layer.emphasis === "stacked";
  const content = stacked ? layer.content.split("").join("\n") : layer.content;

  return (
    <span
      className={cn(
        "puzzle-text-layer inline-block text-foreground animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both motion-reduce:animate-none",
        sizeClass,
        textEmphasisClass(layer.emphasis),
        stacked && "whitespace-pre text-center"
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 45}ms` }}
    >
      {content}
    </span>
  );
}

function OperatorTile({
  layer,
  sizeClass,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "operator" }>;
  sizeClass: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center text-subtle opacity-80",
        sizeClass,
        "font-medium"
      )}
      aria-hidden
    >
      {layer.symbol}
    </span>
  );
}

function ImageTile({
  layer,
  sizePx,
  index,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "image" }>;
  sizePx: number;
  index: number;
}) {
  const src = layer.src;
  const safe =
    typeof src === "string" && (src.startsWith("data:image/") || src.startsWith("https://"));

  if (!safe) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- generative data URLs / gateway tiles
    <img
      src={src}
      alt={layer.alt}
      width={sizePx}
      height={sizePx}
      className="puzzle-image-tile inline-block shrink-0 rounded-md object-cover animate-in fade-in zoom-in-95 duration-700 fill-mode-both motion-reduce:animate-none"
      style={{
        width: sizePx,
        height: sizePx,
        animationDelay: `${Math.min(index, 6) * 45}ms`,
      }}
      draggable={false}
    />
  );
}

function LayerView({
  layer,
  index,
  size,
}: {
  layer: PuzzleVisualLayer;
  index: number;
  size: BoardSize;
}) {
  const dims = SIZE_PX[size];
  if (layer.kind === "pictogram") {
    return <PictogramTile layer={layer} sizePx={dims.tile} index={index} />;
  }
  if (layer.kind === "text") {
    return <TextTile layer={layer} sizeClass={dims.text} index={index} />;
  }
  if (layer.kind === "operator") {
    return <OperatorTile layer={layer} sizeClass={dims.text} />;
  }
  if (layer.kind === "image") {
    return <ImageTile layer={layer} sizePx={dims.tile} index={index} />;
  }
  return null;
}

/**
 * Renders a generative Rebuzzle board (Ink Pictograms, text devices, operators, images).
 * Falls back to unicode string when layers are empty / unicode-only mode.
 */
export function PuzzleVisualBoard({
  visual,
  fallback,
  size = "large",
  className,
  compact = false,
}: PuzzleVisualBoardProps) {
  const dims = SIZE_PX[compact ? "small" : size];
  const layers = visual.layers ?? [];
  const hasRenderable = layers.some((l) => {
    if (l.kind === "pictogram") return Boolean(l.svg || l.emojiFallback);
    if (l.kind === "image") return Boolean(l.src);
    return true;
  });

  if (!hasRenderable || visual.mode === "unicode") {
    return (
      <div
        className={cn(
          "text-center text-foreground font-semibold whitespace-pre-wrap break-words",
          dims.text,
          className
        )}
      >
        {fallback || visual.unicodeFallback}
      </div>
    );
  }

  const layoutClass =
    visual.layout === "stack"
      ? "flex-col items-center"
      : visual.layout === "grid"
        ? "flex-wrap justify-center max-w-[22rem]"
        : visual.layout === "overlay"
          ? "relative flex-wrap justify-center"
          : "flex-row flex-wrap justify-center items-center";

  return (
    <div
      className={cn("puzzle-visual-board flex w-full max-w-full", layoutClass, dims.gap, className)}
      style={
        {
          "--rb-ink": "#1a1f1c",
          "--rb-canvas": "#f4f6f3",
          "--rb-accent": "#2f6f5e",
          "--rb-strike": "#b23a2d",
        } as CSSProperties
      }
      role="img"
      aria-label={fallback || visual.unicodeFallback}
    >
      {layers.map((layer, index) => (
        <LayerView
          // Layers are ordered composition — index is stable for a given board
          key={`${layer.kind}-${index}`}
          layer={layer}
          index={index}
          size={compact ? "small" : size}
        />
      ))}
      {visual.caption ? (
        <p className="basis-full mt-2 text-center text-sm text-subtle animate-in fade-in duration-700 delay-200 motion-reduce:animate-none">
          {visual.caption}
        </p>
      ) : null}
    </div>
  );
}

/** True when the visual has something richer than a plain emoji string. */
export function hasComposedVisual(visual?: PuzzleVisual | null): boolean {
  if (!visual?.layers?.length) return false;
  if (visual.mode === "unicode") return false;
  return visual.layers.some(
    (l) =>
      (l.kind === "pictogram" && (l.svg || l.emojiFallback)) ||
      l.kind === "text" ||
      (l.kind === "image" && l.src) ||
      l.kind === "operator"
  );
}
