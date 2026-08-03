"use client";

import { GameOverShell } from "./game-over-shell";
import { useGameOver } from "./use-game-over";

export default function GameOverClient(props: any) {
  const state = useGameOver(props);
  return <GameOverShell {...state} />;
}
