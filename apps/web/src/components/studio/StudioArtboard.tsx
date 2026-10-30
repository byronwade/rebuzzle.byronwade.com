"use client";

import { useRef, useState } from "react";
import type { PuzzleVisual } from "@/ai/puzzle-agent/visual/composition";
import {
  defaultPositionForIndex,
  type LayerPosition,
  layerPositionDeltaFromPixels,
  layerPositionsFromBounds,
  nudgePosition,
  STUDIO_GRID_STEP,
  type StudioArrowKey,
  snapPosition,
} from "@/ai/puzzle-agent/visual/layer-position";
import { layoutPuzzleBoard } from "@/ai/puzzle-agent/visual/layout-plan";
import {
  getPuzzleBoardRecognitionProfile,
  PUZZLE_BOARD_SIZE_SPECS,
} from "@/ai/puzzle-agent/visual/presentation";
import { PuzzleVisualLayerView } from "@/components/PuzzleVisualBoard";
import { cn } from "@/lib/utils";

type StudioArtboardProps = {
  visual: PuzzleVisual;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMove: (
    index: number,
    position: LayerPosition,
    positions: LayerPosition[],
    freeCanvasHeight: number
  ) => void;
  className?: string;
};

type DragState = {
  index: number;
  pointerId: number;
  originX: number;
  originY: number;
  startPos: LayerPosition;
  startPositions: LayerPosition[];
};

const PROFILE_ID = "desktop-768";
const BOARD_SIZE = "large";
const PROFILE = getPuzzleBoardRecognitionProfile(PROFILE_ID);

function centerPositionsForPlan(
  plan: ReturnType<typeof layoutPuzzleBoard>,
  targetFrame: ReturnType<typeof layoutPuzzleBoard>
): LayerPosition[] {
  return layerPositionsFromBounds(plan.positions, {
    width: targetFrame.width,
    height: targetFrame.height,
    padding: PROFILE.padding,
  });
}

/**
 * Interactive Studio canvas — the visible clue board and editor handles share player geometry.
 * Drag controls sit over the same large-profile layer frames used by player and review rendering.
 */
export function StudioArtboard({
  visual,
  selectedIndex,
  onSelect,
  onMove,
  className,
}: StudioArtboardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [livePos, setLivePos] = useState<LayerPosition | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const layers = visual.layers ?? [];

  const plan = layoutPuzzleBoard(visual, PROFILE_ID, { size: BOARD_SIZE });
  const freePlan = layoutPuzzleBoard({ ...visual, layout: "free" }, PROFILE_ID, {
    size: BOARD_SIZE,
    freeCanvasHeight: plan.height,
  });
  const basePositions = centerPositionsForPlan(plan, freePlan);
  const availableWidth = freePlan.width - PROFILE.padding * 2;
  const livePositions = drag
    ? drag.startPositions.map((position, index) =>
        drag.index === index && livePos ? livePos : position
      )
    : basePositions;
  const displayVisual = drag
    ? {
        ...visual,
        layout: "free" as const,
        layers: layers.map((layer, index) => ({
          ...layer,
          x: livePositions[index]?.x ?? defaultPositionForIndex(index).x,
          y: livePositions[index]?.y ?? defaultPositionForIndex(index).y,
        })),
      }
    : visual;
  const displayPlan = drag
    ? layoutPuzzleBoard(displayVisual, PROFILE_ID, {
        size: BOARD_SIZE,
        freeCanvasHeight: freePlan.height,
      })
    : plan;

  const positionFromEvent = (event: React.PointerEvent, state: DragState) => {
    const board = boardRef.current;
    if (!board) return state.startPos;
    const contentSize = {
      width: board.clientWidth * ((freePlan.width - PROFILE.padding * 2) / freePlan.width),
      height: board.clientHeight * ((freePlan.height - PROFILE.padding * 2) / freePlan.height),
    };
    const delta = layerPositionDeltaFromPixels(
      {
        x: event.clientX - state.originX,
        y: event.clientY - state.originY,
      },
      contentSize
    );
    return snapPosition({
      x: state.startPos.x + delta.x,
      y: state.startPos.y + delta.y,
    });
  };

  const handlePointerDown = (index: number, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const startPositions = basePositions;
    const startPos = startPositions[index] ?? defaultPositionForIndex(index);
    onSelect(index);
    setDrag({
      index,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startPos,
      startPositions,
    });
    setLivePos(startPos);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setLivePos(positionFromEvent(event, drag));
  };

  const endDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const next = positionFromEvent(event, drag);
    const positions = drag.startPositions.map((position, index) =>
      index === drag.index ? next : position
    );
    onMove(drag.index, next, positions, freePlan.height);
    setDrag(null);
    setLivePos(null);
  };

  const cancelDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    setDrag(null);
    setLivePos(null);
  };

  const moveWithKeyboard = (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown"
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const positions = drag ? livePositions : basePositions;
    const current = positions[index] ?? defaultPositionForIndex(index);
    const next = nudgePosition(current, event.key as StudioArrowKey);
    const updated = positions.map((position, positionIndex) =>
      positionIndex === index ? next : position
    );
    const layer = layers[index];
    const label = layer
      ? layer.kind === "pictogram"
        ? layer.concept
        : layer.kind === "text"
          ? layer.content
          : layer.kind === "operator"
            ? layer.symbol
            : layer.alt
      : "puzzle piece";
    onSelect(index);
    onMove(index, next, updated, freePlan.height);
    setAnnouncement(`Moved ${label} to ${next.x}% from the left and ${next.y}% from the top.`);
  };

  if (!layers.length) {
    return (
      <div
        className={cn(
          "flex min-h-[220px] items-center justify-center rounded-lg border border-border border-dashed bg-inset p-5",
          className
        )}
      >
        <p className="max-w-xs text-center text-muted-foreground text-sm leading-6">
          Your artboard appears here. Tap icons, marks, or generate an image — then drag pieces
          anywhere. They snap to a {STUDIO_GRID_STEP}% grid.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={boardRef}
        className="relative overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        data-studio-canvas={[displayPlan.width, displayPlan.height].join(",")}
        style={{
          aspectRatio: `${displayPlan.width} / ${displayPlan.height}`,
          touchAction: "none",
          containerType: "inline-size",
        }}
        onPointerDown={() => onSelect(selectedIndex)}
      >
        <div
          className="pointer-events-none absolute border border-border/60"
          aria-hidden
          style={{
            left: `${(PROFILE.padding / displayPlan.width) * 100}%`,
            top: `${(PROFILE.padding / displayPlan.height) * 100}%`,
            width: `${((displayPlan.width - PROFILE.padding * 2) / displayPlan.width) * 100}%`,
            height: `${((displayPlan.height - PROFILE.padding * 2) / displayPlan.height) * 100}%`,
            backgroundImage:
              "linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)",
            backgroundSize: `${STUDIO_GRID_STEP}% ${STUDIO_GRID_STEP}%`,
          }}
        />

        {layers.map((layer, index) => {
          const bounds = displayPlan.positions[index];
          if (!bounds) return null;
          const selected = selectedIndex === index;
          const pieceName =
            layer.kind === "pictogram"
              ? layer.concept
              : layer.kind === "text"
                ? layer.content
                : layer.kind === "operator"
                  ? layer.symbol
                  : layer.alt;
          const position =
            drag?.index === index ? (livePos ?? basePositions[index]) : basePositions[index];
          return (
            <button
              key={`piece-${index}`}
              type="button"
              aria-label={`Move ${pieceName}; position ${Math.round(position?.x ?? 50)}% from left, ${Math.round(position?.y ?? 50)}% from top`}
              aria-describedby="studio-artboard-keyboard-help"
              aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
              className={cn(
                "absolute touch-none select-none rounded-md outline-none transition-shadow",
                selected
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-card"
                  : "hover:ring-1 hover:ring-border-strong",
                drag?.index === index && "z-50 cursor-grabbing"
              )}
              data-studio-layer-index={index}
              data-studio-layer-bounds={[bounds.x, bounds.y, bounds.width, bounds.height].join(",")}
              style={{
                left: `${(bounds.x / displayPlan.width) * 100}%`,
                top: `${(bounds.y / displayPlan.height) * 100}%`,
                width: `${(bounds.width / displayPlan.width) * 100}%`,
                height: `${(bounds.height / displayPlan.height) * 100}%`,
                zIndex: drag?.index === index ? 50 : index + 1,
                cursor: drag?.index === index ? "grabbing" : "grab",
                fontSize: `${(PUZZLE_BOARD_SIZE_SPECS[BOARD_SIZE].tile / displayPlan.width) * 100}cqw`,
              }}
              onClick={() => onSelect(index)}
              onFocus={() => onSelect(index)}
              onKeyDown={(event) => moveWithKeyboard(index, event)}
              onPointerDown={(event) => handlePointerDown(index, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={cancelDrag}
            >
              <PuzzleVisualLayerView
                layer={layer}
                index={index}
                size={BOARD_SIZE}
                availableWidth={availableWidth}
              />
            </button>
          );
        })}
      </div>
      <p id="studio-artboard-keyboard-help" className="text-center text-subtle text-xs">
        Drag to place or focus a piece and use the arrow keys · snaps to a {STUDIO_GRID_STEP}% grid
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
