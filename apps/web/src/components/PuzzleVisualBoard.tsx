"use client";

import Image from "next/image";
import { type CSSProperties, useCallback, useEffect, useState } from "react";
import {
  type CanonicalBoard,
  canonicalBoardForProfile,
  validateCanonicalBoard,
} from "@/ai/puzzle-agent/visual/canonical-contract";
import { estimateTextFontScale, layoutPuzzleBoard } from "@/ai/puzzle-agent/visual/layout-plan";
import {
  getLargePlayerLayout,
  getPuzzleBoardRecognitionProfile,
  PUZZLE_BOARD_CHROME,
  PUZZLE_BOARD_SIZE_SPECS,
  PUZZLE_BOARD_SVG_FONT_FAMILY,
  type PuzzleBoardRecognitionProfileId,
  type PuzzleBoardSize,
  puzzleBoardFontSize,
  puzzleBoardLetterSpacingEm,
  puzzleBoardTextWeight,
} from "@/ai/puzzle-agent/visual/presentation";
import { sanitizePictogramSvg } from "@/ai/puzzle-agent/visual/sanitize-svg";
import { INK_PICTOGRAM_PALETTE } from "@/ai/puzzle-agent/visual/style";
import type { PuzzleVisual, PuzzleVisualLayer } from "@/lib/gameSettings";
import { resolvePuzzleSurface } from "@/lib/puzzle-surface";
import { cn } from "@/lib/utils";

/** Never reveal unchecked pixels or silently substitute a different clue layout. */
function CanonicalBoardImage({
  board,
  label,
  className,
  profileIds,
  responsive,
  containerRef,
}: {
  board: CanonicalBoard;
  label: string;
  className?: string;
  profileIds: readonly PuzzleBoardRecognitionProfileId[];
  responsive: boolean;
  containerRef: (node: HTMLDivElement | null) => void;
}) {
  const profileSignature = profileIds.join(",");
  const [verified, setVerified] = useState<{
    board: CanonicalBoard;
    profileSignature: string;
  } | null>(null);
  const [failed, setFailed] = useState<{ board: CanonicalBoard; profileSignature: string } | null>(
    null
  );
  useEffect(() => {
    let active = true;
    Promise.all(
      profileIds.map((profileId) =>
        validateCanonicalBoard(canonicalBoardForProfile(board, profileId))
      )
    ).then(
      () => active && setVerified({ board, profileSignature }),
      () => active && setFailed({ board, profileSignature })
    );
    return () => {
      active = false;
    };
  }, [board, profileSignature, profileIds]);
  if (failed?.board === board && failed.profileSignature === profileSignature)
    return (
      <div ref={containerRef} className="w-full max-w-full" role="alert" style={{ width: "100%" }}>
        This puzzle image could not be verified. Please reload to try again.
      </div>
    );
  if (verified?.board !== board || verified.profileSignature !== profileSignature)
    return (
      <div ref={containerRef} className="w-full max-w-full" role="status" style={{ width: "100%" }}>
        Loading puzzle image…
      </div>
    );
  return (
    <div
      ref={containerRef}
      className={cn("puzzle-visual-board w-full max-w-full", className)}
      data-layout-lock="canonical-v1"
      data-responsive-profile={responsive ? "large" : undefined}
      role="img"
      aria-label={label}
      style={
        responsive ? { containerType: "inline-size", containerName: "rb-puzzle-board" } : undefined
      }
    >
      {profileIds.map((profileId) => {
        const profile = getPuzzleBoardRecognitionProfile(profileId);
        const profileClass =
          profileIds.length === 1
            ? "puzzle-board-profile-single"
            : profileId === "mobile-375"
              ? "puzzle-board-profile-mobile"
              : profileId === "desktop-768"
                ? "puzzle-board-profile-desktop"
                : "puzzle-board-profile-single";
        const selected = canonicalBoardForProfile(board, profileId);
        return (
          <div
            className={profileClass}
            data-board-profile={profileId}
            key={profileId}
            style={{ width: "100%", maxWidth: profile.viewportWidth, marginInline: "auto" }}
          >
            {/* biome-ignore lint/performance/noImgElement: Exact reviewed PNG bytes must bypass image optimization. */}
            <img
              src={selected.pngDataUrl}
              width={selected.width}
              height={selected.height}
              alt=""
              aria-hidden="true"
              className="block max-w-full"
              style={{ width: "100%", height: "auto", objectFit: "contain" }}
            />
          </div>
        );
      })}
    </div>
  );
}

interface PuzzleVisualBoardProps {
  visual: PuzzleVisual;
  /** Unicode fallback when layers can't render */
  fallback: string;
  size?: PuzzleBoardSize;
  className?: string;
  /** Compact keyboard-aware strip */
  compact?: boolean;
}

const PLAYER_PROFILE_IDS: Record<PuzzleBoardSize, readonly PuzzleBoardRecognitionProfileId[]> = {
  small: ["compact-320"],
  medium: ["mobile-375-medium"],
  large: ["mobile-375", "desktop-768"],
};
function textLayerStyle(
  emphasis: string | undefined,
  baseFontSize: number,
  tileSize: number,
  fitScale: number
): CSSProperties {
  const fontSize = puzzleBoardFontSize(emphasis, baseFontSize) * fitScale;
  const fontWeight = puzzleBoardTextWeight(emphasis);
  const letterSpacing = `${puzzleBoardLetterSpacingEm(emphasis)}em`;
  const style: CSSProperties = {
    fontSize: `${fontSize / tileSize}em`,
    fontWeight,
    fontFamily: PUZZLE_BOARD_SVG_FONT_FAMILY,
    letterSpacing,
    color: "var(--rb-ink)",
    lineHeight: emphasis === "stacked" ? 1.04 : 1.05,
    maxWidth: "100%",
    maxHeight: "100%",
    minWidth: 0,
    overflow: "hidden",
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
  index,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "pictogram" }>;
  index: number;
}) {
  const safeSvg = layer.svg ? sanitizePictogramSvg(layer.svg) : null;

  if (safeSvg) {
    return (
      <span
        className="rb-enter puzzle-pictogram inline-flex shrink-0 items-center justify-center"
        style={{
          width: "100%",
          height: "100%",
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
        width: "100%",
        height: "100%",
        fontSize: `${PUZZLE_BOARD_CHROME.fallbackGlyphFactor}em`,
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
  tileSize,
  fitScale,
  index,
}: {
  layer: Extract<PuzzleVisualLayer, { kind: "text" }>;
  baseFontSize: number;
  tileSize: number;
  fitScale: number;
  index: number;
}) {
  const stacked = layer.emphasis === "stacked";
  const content = stacked ? layer.content.split("").join("\n") : layer.content;

  return (
    <span
      className={cn(
        "puzzle-text-layer rb-enter inline-block",
        stacked && "whitespace-pre text-center"
      )}
      style={{
        ...textLayerStyle(layer.emphasis, baseFontSize, tileSize, fitScale),
        whiteSpace: stacked ? "pre" : "nowrap",
        textAlign: "center",
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
      className="inline-flex items-center justify-center"
      style={{
        width: "100%",
        height: "100%",
        fontSize: `${baseFontSize / tile}em`,
        fontWeight: puzzleBoardTextWeight("operator"),
        fontFamily: PUZZLE_BOARD_SVG_FONT_FAMILY,
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
    width: "100%",
    height: "100%",
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
  availableWidth,
}: {
  layer: PuzzleVisualLayer;
  index: number;
  size: PuzzleBoardSize;
  availableWidth: number;
}) {
  const dims = PUZZLE_BOARD_SIZE_SPECS[size];
  if (layer.kind === "pictogram") {
    return <PictogramTile layer={layer} index={index} />;
  }
  if (layer.kind === "text") {
    return (
      <TextTile
        layer={layer}
        baseFontSize={dims.fontSize}
        tileSize={dims.tile}
        fitScale={estimateTextFontScale(layer, availableWidth, size)}
        index={index}
      />
    );
  }
  if (layer.kind === "operator") {
    return <OperatorTile layer={layer} tile={dims.tile} baseFontSize={dims.fontSize} />;
  }
  if (layer.kind === "image") {
    return <ImageTile layer={layer} sizePx={dims.tile} index={index} />;
  }
  return null;
}

export { LayerView as PuzzleVisualLayerView };

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
  const [boardElement, setBoardElement] = useState<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number | undefined>();
  const containerRef = useCallback((node: HTMLDivElement | null) => setBoardElement(node), []);
  useEffect(() => {
    if (resolvedSize !== "large" || !boardElement) return;
    const updateWidth = () => {
      const measured = Math.round(boardElement.getBoundingClientRect().width);
      if (measured > 0)
        setContainerWidth((previous) => (previous === measured ? previous : measured));
    };
    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(boardElement);
    return () => observer.disconnect();
  }, [boardElement, resolvedSize]);
  const layers = visual.layers ?? [];
  const hasRenderable = layers.some((layer) => {
    if (layer.kind === "pictogram") return Boolean(layer.svg || layer.emojiFallback);
    if (layer.kind === "image") return Boolean(layer.src);
    return true;
  });

  const surface = resolvePuzzleSurface(visual);
  const largeLayout =
    resolvedSize === "large" && containerWidth !== undefined
      ? getLargePlayerLayout(containerWidth)
      : undefined;
  const renderSize = largeLayout?.size ?? resolvedSize;
  const dims = PUZZLE_BOARD_SIZE_SPECS[renderSize];
  const profileIds = largeLayout
    ? PLAYER_PROFILE_IDS[largeLayout.size]
    : PLAYER_PROFILE_IDS[resolvedSize];
  const dynamicLayoutOptions = largeLayout
    ? {
        size: largeLayout.size,
        viewportWidth: largeLayout.viewportWidth,
        padding: largeLayout.padding,
      }
    : undefined;
  const hasCanonicalProfiles = (board: CanonicalBoard) =>
    profileIds.every(
      (profileId) => profileId === "desktop-768" || Boolean(board.profileVariants?.[profileId])
    );
  const canonicalUsable =
    visual.canonicalBoard !== undefined &&
    (!largeLayout || largeLayout.useCanonicalProfile) &&
    hasCanonicalProfiles(visual.canonicalBoard);

  if (canonicalUsable && visual.canonicalBoard) {
    return (
      <CanonicalBoardImage
        board={visual.canonicalBoard}
        label={fallback || visual.unicodeFallback}
        className={className}
        profileIds={profileIds}
        responsive={resolvedSize === "large" && profileIds.length > 1}
        containerRef={containerRef}
      />
    );
  }

  if (
    !hasRenderable ||
    visual.mode === "unicode" ||
    (largeLayout !== undefined && !largeLayout.isSupportedWidth)
  ) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "w-full min-w-0 max-w-full text-center font-sans whitespace-pre-wrap break-words",
          className
        )}
        style={{
          width: "100%",
          minWidth: 0,
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

  const boardStyle = {
    "--rb-ink": surface.ink,
    "--rb-canvas": surface.canvas,
    "--rb-mist": INK_PICTOGRAM_PALETTE.mist,
    "--rb-accent": INK_PICTOGRAM_PALETTE.accent,
    "--rb-strike": INK_PICTOGRAM_PALETTE.strike,
    color: surface.ink,
  } as CSSProperties;
  const layoutLock =
    visual.layout === "free"
      ? "free"
      : visual.layout === "overlay"
        ? "overlay"
        : "viewport-invariant";

  return (
    <div
      className={cn("puzzle-visual-board w-full max-w-full", className)}
      data-layout-lock={layoutLock}
      ref={containerRef}
      data-responsive-profile={resolvedSize === "large" && !largeLayout ? "large" : undefined}
      data-surface={surface.mode}
      style={{
        ...boardStyle,
        ...(resolvedSize === "large" && !largeLayout
          ? { containerType: "inline-size", containerName: "rb-puzzle-board" }
          : {}),
      }}
      role="img"
      aria-label={fallback || visual.unicodeFallback}
    >
      {profileIds.map((profileId) => {
        const profile = getPuzzleBoardRecognitionProfile(profileId);
        const plan = layoutPuzzleBoard(visual, profileId, dynamicLayoutOptions);
        const padding = dynamicLayoutOptions?.padding ?? profile.padding;
        const availableWidth = plan.width - padding * 2;
        const profileClass =
          profileIds.length === 1
            ? "puzzle-board-profile-single"
            : profileId === "mobile-375"
              ? "puzzle-board-profile-mobile"
              : profileId === "desktop-768"
                ? "puzzle-board-profile-desktop"
                : "puzzle-board-profile-single";

        return (
          <div
            className={profileClass}
            data-board-profile={profileId}
            key={profileId}
            style={{ width: "100%", maxWidth: plan.width, marginInline: "auto" }}
          >
            <div
              className="relative w-full max-w-full"
              data-layout-lock={visual.layout === "free" ? "free" : visual.layout}
              data-surface={surface.mode}
              data-board-canvas={[plan.width, plan.height].join(",")}
              style={{
                aspectRatio: `${plan.width} / ${plan.height}`,
                containerType: "inline-size",
              }}
            >
              {layers.map((layer, index) => {
                const position = plan.positions[index];
                if (!position) return null;
                return (
                  <div
                    key={`layer-${index}`}
                    className="absolute flex items-center justify-center"
                    data-board-layer-index={index}
                    data-board-bounds={[
                      position.x,
                      position.y,
                      position.width,
                      position.height,
                    ].join(",")}
                    style={{
                      left: `${(position.x / plan.width) * 100}%`,
                      top: `${(position.y / plan.height) * 100}%`,
                      width: `${(position.width / plan.width) * 100}%`,
                      height: `${(position.height / plan.height) * 100}%`,
                      zIndex: index + 1,
                      fontSize: `${(dims.tile / plan.width) * 100}cqw`,
                    }}
                  >
                    <LayerView
                      layer={layer}
                      index={index}
                      size={renderSize}
                      availableWidth={availableWidth}
                    />
                  </div>
                );
              })}
            </div>
            {visual.caption ? (
              <p
                className="rb-enter mt-2 w-full text-center"
                style={{
                  color: "var(--rb-mist)",
                  fontSize: `${
                    (Math.max(
                      PUZZLE_BOARD_CHROME.captionMinSize,
                      Math.round(dims.fontSize * PUZZLE_BOARD_CHROME.captionSizeFactor)
                    ) /
                      plan.width) *
                    100
                  }cqw`,
                  fontWeight: puzzleBoardTextWeight("normal"),
                  fontFamily: PUZZLE_BOARD_SVG_FONT_FAMILY,
                }}
              >
                {visual.caption}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
