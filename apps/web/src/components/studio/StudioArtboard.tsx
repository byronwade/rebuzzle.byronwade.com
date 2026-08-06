"use client";

import { useRef, useState } from "react";
import type { PuzzleVisual, VisualLayer } from "@/ai/puzzle-agent/visual/composition";
import {
  defaultPositionForIndex,
  hasLayerPosition,
  STUDIO_GRID_STEP,
  snapPosition,
} from "@/ai/puzzle-agent/visual/layer-position";
import { PuzzleVisualBoard } from "@/components/PuzzleVisualBoard";
import { cn } from "@/lib/utils";

type StudioArtboardProps = {
  visual: PuzzleVisual;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onMove: (index: number, position: { x: number; y: number }) => void;
  className?: string;
};

type DragState = {
  index: number;
  pointerId: number;
  originX: number;
  originY: number;
  startPos: { x: number; y: number };
};

function layerPosition(layer: VisualLayer, index: number) {
  return hasLayerPosition(layer) ? { x: layer.x, y: layer.y } : defaultPositionForIndex(index);
}

/**
 * Interactive Studio canvas — drag pieces freely with grid snap.
 * Player preview still uses PuzzleVisualBoard (non-interactive).
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
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);

  const layers = visual.layers ?? [];

  const handlePointerDown = (index: number, event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const startPos = layerPosition(layers[index]!, index);
    onSelect(index);
    setDrag({
      index,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startPos,
    });
    setLivePos(startPos);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const dx = ((event.clientX - drag.originX) / rect.width) * 100;
    const dy = ((event.clientY - drag.originY) / rect.height) * 100;
    setLivePos(
      snapPosition({
        x: drag.startPos.x + dx,
        y: drag.startPos.y + dy,
      })
    );
  };

  const endDrag = (event: React.PointerEvent) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const board = boardRef.current;
    if (board) {
      const rect = board.getBoundingClientRect();
      const dx = ((event.clientX - drag.originX) / rect.width) * 100;
      const dy = ((event.clientY - drag.originY) / rect.height) * 100;
      const next = snapPosition({
        x: drag.startPos.x + dx,
        y: drag.startPos.y + dy,
      });
      onMove(drag.index, next);
    }
    setDrag(null);
    setLivePos(null);
  };

  if (!layers.length) {
    return (
      <div
        className={cn(
          "flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-teal-900/15 bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] p-5",
          className
        )}
      >
        <p className="max-w-xs text-center text-sm text-teal-900/45">
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
        className="relative overflow-hidden rounded-xl border border-teal-900/15 bg-[linear-gradient(180deg,#fbfefe,#f3faf8)] shadow-sm"
        style={{
          aspectRatio: "16 / 10",
          backgroundImage:
            "linear-gradient(to right, rgb(13 148 136 / 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgb(13 148 136 / 0.07) 1px, transparent 1px)",
          backgroundSize: `${STUDIO_GRID_STEP}% ${STUDIO_GRID_STEP}%`,
          touchAction: "none",
        }}
        onPointerDown={() => onSelect(selectedIndex)}
      >
        {/* Hidden preview keeps layer metrics consistent with player board */}
        <div className="pointer-events-none invisible absolute inset-0" aria-hidden>
          <PuzzleVisualBoard fallback={visual.unicodeFallback} size="large" visual={visual} />
        </div>

        {layers.map((layer, index) => {
          const base = layerPosition(layer, index);
          const pos = drag?.index === index && livePos ? livePos : base;
          const selected = selectedIndex === index;
          return (
            <button
              key={`piece-${index}`}
              type="button"
              aria-label={`Move ${layer.kind === "pictogram" ? layer.concept : layer.kind === "text" ? layer.content : layer.kind === "operator" ? layer.symbol : layer.alt}`}
              className={cn(
                "absolute touch-none select-none rounded-md outline-none transition-shadow",
                selected
                  ? "ring-2 ring-teal-700 ring-offset-2 ring-offset-[#f7fbfa]"
                  : "hover:ring-1 hover:ring-teal-800/25",
                drag?.index === index && "z-50 cursor-grabbing"
              )}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: "translate(-50%, -50%)",
                zIndex: drag?.index === index ? 50 : index + 1,
                cursor: drag?.index === index ? "grabbing" : "grab",
              }}
              onPointerDown={(event) => handlePointerDown(index, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <PuzzleVisualBoard
                className="pointer-events-none [&_.puzzle-visual-board]:min-h-0"
                fallback=""
                size="medium"
                visual={{
                  ...visual,
                  layout: "row",
                  layers: [layer],
                  unicodeFallback: "◆",
                }}
              />
            </button>
          );
        })}
      </div>
      <p className="text-center text-[11px] text-teal-900/50">
        Drag to place · snaps to grid · tap a piece to select
      </p>
    </div>
  );
}
