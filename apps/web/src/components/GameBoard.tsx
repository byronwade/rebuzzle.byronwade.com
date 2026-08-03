"use client";

import { GameBoardShell } from "./game-board-shell";
import { useGameBoard } from "./use-game-board";

export function GameBoard(props: any) {
  const state = useGameBoard(props);
  return <GameBoardShell {...state} />;
}
