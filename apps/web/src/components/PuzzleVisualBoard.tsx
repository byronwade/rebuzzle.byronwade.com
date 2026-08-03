"use client";

import { type CSSProperties, useMemo } from "react";
import {
  PUZZLE_BOARD_SIZE_SPECS,
  type PuzzleBoardSize,
} from "@/ai/puzzle-agent/visual/presentation";
import { sanitizePictogramSvg } from "@/ai/puzzle-agent/visual/sanitize-svg";
import { INK_PICTOGRAM_PALETTE } from "@/ai/puzzle-agent/visual/style";
import type { PuzzleVisual, PuzzleVisualLayer } from "@/lib/gameSettings";
import { resolvePuzzleSurface } from "@/lib/puzzle-surface";
import { cn } from "@/lib/utils";

interface PuzzleVisualBoardProps {
  visual: PuzzleVisual;
  /** Unicode fallback when layers can't render */
  fallback: string;
  size?: PuzzleBoardSize;
  className?: string;
  /** Compact keyboard-aware strip */
  compact?: boolean;
}

const TEXT_SIZE_CLASS: Record<PuzzleBoardSize, string> = {
  small: "text-lg",
  medium: "text-2xl",
  large: "text-[clamp(1.75rem,5vw,2.75rem)]",
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
        "puzzle-text-layer inline-block animate-in fade-in slide-in-from-bottom-1 duration-500 fill-mode-both motion-reduce:animate-none",
        sizeClass,
        textEmphasisClass(layer.emphasis),
        stacked && "whitespace-pre text-center"
      )}
      style={{
        animationDelay: `${Math.min(index, 6) * 45}ms`,
        color: "var(--rb-ink)",
      }}
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
      className={cn("inline-flex items-center justify-center opacity-75", sizeClass, "font-medium")}
      style={{ color: "var(--rb-mist, var(--rb-ink))" }}
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

  // data: URLs from AI Gateway aren't a fit for next/image
  return (
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
  size: PuzzleBoardSize;
}) {
  const dims = PUZZLE_BOARD_SIZE_SPECS[size];
  const textClass = TEXT_SIZE_CLASS[size];
  if (layer.kind === "pictogram") {
    return <PictogramTile layer={layer} sizePx={dims.tile} index={index} />;
  }
  if (layer.kind === "text") {
    return <TextTile layer={layer} sizeClass={textClass} index={index} />;
  }
  if (layer.kind === "operator") {
    return <OperatorTile layer={layer} sizeClass={textClass} />;
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
  const resolvedSize = compact ? "small" : size;
  const dims = PUZZLE_BOARD_SIZE_SPECS[resolvedSize];
  const textClass = TEXT_SIZE_CLASS[resolvedSize];
  const layers = visual.layers ?? [];
  const hasRenderable = layers.some((l) => {
    if (l.kind === "pictogram") return Boolean(l.svg || l.emojiFallback);
    if (l.kind === "image") return Boolean(l.src);
    return true;
  });

  const surface = resolvePuzzleSurface(visual);

  if (!hasRenderable || visual.mode === "unicode") {
    return (
      <div
        className={cn(
          "text-center font-semibold whitespace-pre-wrap break-words",
          textClass,
          className
        )}
        style={{ color: surface.ink }}
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
      className={cn("puzzle-visual-board flex w-full max-w-full", layoutClass, className)}
      data-surface={surface.mode}
      style={
        {
          "--rb-ink": surface.ink,
          "--rb-canvas": surface.canvas,
          "--rb-mist": INK_PICTOGRAM_PALETTE.mist,
          "--rb-accent": INK_PICTOGRAM_PALETTE.accent,
          "--rb-strike": INK_PICTOGRAM_PALETTE.strike,
          color: surface.ink,
          gap: dims.gap,
        } as CSSProperties
      }
      role="img"
      aria-label={fallback || visual.unicodeFallback}
    >
      {layers.map((layer, index) => (
        <LayerView
          // Layers are ordered composition — index is stable for a given board
          key={`${layer.kind}-${"svg" in layer && layer.svg ? layer.svg.slice(0, 48) : ""}${
            "text" in layer && layer.text ? layer.text : ""
          }${"src" in layer && layer.src ? layer.src : ""}${
            "emojiFallback" in layer && layer.emojiFallback ? layer.emojiFallback : ""
          }`}
          layer={layer}
          index={index}
          size={resolvedSize}
        />
      ))}
      {visual.caption ? (
        <p
          className="basis-full mt-2 text-center text-sm opacity-70 animate-in fade-in duration-700 delay-200 motion-reduce:animate-none"
          style={{ color: "var(--rb-ink)" }}
        >
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
