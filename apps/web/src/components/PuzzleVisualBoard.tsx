"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { planPlayerLockedRows } from "@/ai/puzzle-agent/visual/layout-plan";
import {
  PUZZLE_BOARD_CHROME,
  PUZZLE_BOARD_SIZE_SPECS,
  puzzleBoardFontSize,
  puzzleBoardLetterSpacingEm,
  puzzleBoardOperatorWidth,
  puzzleBoardTextWeight,
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

function textLayerStyle(emphasis: string | undefined, baseFontSize: number): CSSProperties {
  const fontSize = puzzleBoardFontSize(emphasis, baseFontSize);
  const fontWeight = puzzleBoardTextWeight(emphasis);
  const letterSpacing = `${puzzleBoardLetterSpacingEm(emphasis)}em`;
  const style: CSSProperties = {
    fontSize,
    fontWeight,
    letterSpacing,
    color: "var(--rb-ink)",
    lineHeight: emphasis === "stacked" ? 0.95 : 1.05,
  };
  if (emphasis === "tiny") {
    style.textTransform = "uppercase";
  }
  if (emphasis === "strike") {
    style.textDecoration = "line-through";
    style.textDecorationThickness = "0.12em";
    style.textDecorationColor = "var(--rb-strike)";
  }
  return style;
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
  const safeSvg = layer.svg ? sanitizePictogramSvg(layer.svg) : null;

  if (safeSvg) {
    return (
      <span
        className="rb-enter puzzle-pictogram inline-flex shrink-0 items-center justify-center"
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

  // Keep fallbacks inside the ink language — no multicolor OS emoji salad.
  return (
    <span
      className="puzzle-pictogram-fallback inline-flex shrink-0 items-center justify-center leading-none"
      style={{
        width: sizePx,
        height: sizePx,
        fontSize: sizePx * PUZZLE_BOARD_CHROME.fallbackGlyphFactor,
        fontWeight: puzzleBoardTextWeight("normal"),
        color: "var(--rb-ink)",
        background: "var(--rb-canvas)",
        border: "1px solid color-mix(in oklab, var(--rb-mist) 55%, transparent)",
        borderRadius: 8,
        filter: "grayscale(1) contrast(1.12)",
        animationDelay: `${Math.min(index, 6) * 45}ms`,
      }}
      role="img"
      aria-label={layer.concept}
    >
      {layer.emojiFallback}
    </span>
  );
}

function TextTile({
  layer,
  baseFontSize,
  index,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "text" }>;
  baseFontSize: number;
  index: number;
}) {
  const stacked = layer.emphasis === "stacked";
  const content = stacked ? layer.content.split("").join("\n") : layer.content;

  return (
    <span
      className={cn(
        "puzzle-text-layer rb-enter inline-block font-sans",
        stacked && "whitespace-pre text-center"
      )}
      style={{
        ...textLayerStyle(layer.emphasis, baseFontSize),
        animationDelay: `${Math.min(index, 6) * 45}ms`,
      }}
    >
      {content}
    </span>
  );
}

function OperatorTile({
  layer,
  tile,
  baseFontSize,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "operator" }>;
  tile: number;
  baseFontSize: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center font-sans"
      style={{
        width: puzzleBoardOperatorWidth(tile),
        height: tile,
        fontSize: baseFontSize,
        fontWeight: puzzleBoardTextWeight("operator"),
        letterSpacing: `${puzzleBoardLetterSpacingEm("operator")}em`,
        color: "var(--rb-mist)",
      }}
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

  const tileStyle = {
    width: sizePx,
    height: sizePx,
    animationDelay: `${Math.min(index, 6) * 45}ms`,
  } as CSSProperties;

  // Square tiles match pictogram slots — no rounded media cards on the board.
  if (src.startsWith("data:image/")) {
    return (
      <img
        src={src}
        alt={layer.alt}
        width={sizePx}
        height={sizePx}
        className="rb-enter puzzle-image-tile inline-block shrink-0 object-cover"
        style={tileStyle}
        draggable={false}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={layer.alt}
      width={sizePx}
      height={sizePx}
      unoptimized
      className="rb-enter puzzle-image-tile inline-block shrink-0 object-cover"
      style={tileStyle}
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
  if (layer.kind === "pictogram") {
    return <PictogramTile layer={layer} sizePx={dims.tile} index={index} />;
  }
  if (layer.kind === "text") {
    return <TextTile layer={layer} baseFontSize={dims.fontSize} index={index} />;
  }
  if (layer.kind === "operator") {
    return <OperatorTile layer={layer} tile={dims.tile} baseFontSize={dims.fontSize} />;
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
        className={cn("text-center font-sans whitespace-pre-wrap break-words", className)}
        style={{
          color: surface.ink,
          fontSize: dims.fontSize,
          fontWeight: puzzleBoardTextWeight("normal"),
          letterSpacing: `${puzzleBoardLetterSpacingEm("normal")}em`,
          lineHeight: 1.2,
        }}
      >
        {fallback || visual.unicodeFallback}
      </div>
    );
  }

  // Locked row membership matches server recognition profiles — no flex-wrap reflow.
  const rowIndexes =
    visual.layout === "overlay"
      ? [layers.map((_, index) => index)]
      : planPlayerLockedRows(visual, resolvedSize);

  const boardStyle = {
    "--rb-ink": surface.ink,
    "--rb-canvas": surface.canvas,
    "--rb-mist": INK_PICTOGRAM_PALETTE.mist,
    "--rb-accent": INK_PICTOGRAM_PALETTE.accent,
    "--rb-strike": INK_PICTOGRAM_PALETTE.strike,
    color: surface.ink,
    gap: dims.gap,
    rowGap: dims.gap,
  } as CSSProperties;

  if (visual.layout === "overlay") {
    return (
      <div
        className={cn(
          "puzzle-visual-board relative flex w-full max-w-full items-center justify-center",
          className
        )}
        data-layout-lock="overlay"
        data-surface={surface.mode}
        style={boardStyle}
        role="img"
        aria-label={fallback || visual.unicodeFallback}
      >
        {layers.map((layer, index) => {
          const offset = (index - (layers.length - 1) / 2) * Math.max(5, dims.gap * 0.75);
          return (
            <div
              key={`overlay-${index}`}
              className="absolute"
              style={{ transform: `translate(${offset}px, ${offset}px)` }}
            >
              <LayerView layer={layer} index={index} size={resolvedSize} />
            </div>
          );
        })}
        {/* Spacer so relative box has intrinsic size */}
        <div className="invisible flex" style={{ gap: dims.gap }} aria-hidden>
          {layers.map((layer, index) => (
            <LayerView key={`spacer-${index}`} layer={layer} index={index} size={resolvedSize} />
          ))}
        </div>
        {visual.caption ? (
          <p
            className="rb-enter absolute top-full mt-2 w-full text-center font-sans"
            style={{
              color: "var(--rb-mist)",
              fontSize: Math.max(
                PUZZLE_BOARD_CHROME.captionMinSize,
                Math.round(dims.fontSize * PUZZLE_BOARD_CHROME.captionSizeFactor)
              ),
              fontWeight: puzzleBoardTextWeight("normal"),
            }}
          >
            {visual.caption}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn("puzzle-visual-board flex w-full max-w-full flex-col items-center", className)}
      data-layout-lock="viewport-invariant"
      data-surface={surface.mode}
      style={boardStyle}
      role="img"
      aria-label={fallback || visual.unicodeFallback}
    >
      {rowIndexes.map((indexes, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex flex-nowrap items-center justify-center"
          style={{ gap: dims.gap }}
          data-layout-row={rowIndex}
        >
          {indexes.map((index) => {
            const layer = layers[index]!;
            return (
              <LayerView
                key={`${layer.kind}-${index}-${
                  "concept" in layer && layer.concept ? layer.concept : ""
                }${"content" in layer && layer.content ? layer.content : ""}${
                  "symbol" in layer && layer.symbol ? layer.symbol : ""
                }`}
                layer={layer}
                index={index}
                size={resolvedSize}
              />
            );
          })}
        </div>
      ))}
      {visual.caption ? (
        <p
          className="rb-enter mt-2 text-center font-sans"
          style={{
            color: "var(--rb-mist)",
            fontSize: Math.max(
              PUZZLE_BOARD_CHROME.captionMinSize,
              Math.round(dims.fontSize * PUZZLE_BOARD_CHROME.captionSizeFactor)
            ),
            fontWeight: puzzleBoardTextWeight("normal"),
          }}
        >
          {visual.caption}
        </p>
      ) : null}
    </div>
  );
}
