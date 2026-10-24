"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { gameSettings } from "@/lib/gameSettings";

interface GameStateContext {
  difficulty: number | undefined;
  currentAttempts: number;
  maxAttempts: number;
  isPlaying: boolean;
}

interface GameContextValue {
  gameState: GameStateContext;
  setGameState: (state: Partial<GameStateContext>) => void;
  startGame: (difficulty: number) => void;
  recordAttempt: () => void;
  endGame: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameStateInternal] = useState<GameStateContext>({
    difficulty: undefined,
    currentAttempts: 0,
    maxAttempts: gameSettings.maxAttempts,
    isPlaying: false,
  });

  // Stable callbacks: GameBoard lists these as effect dependencies, and fresh
  // functions each render re-ran startGame/endGame in an update loop.
  const setGameState = useCallback((state: Partial<GameStateContext>) => {
    setGameStateInternal((prev) => {
      const changed = (Object.keys(state) as (keyof GameStateContext)[]).some(
        (key) => prev[key] !== state[key]
      );
      return changed ? { ...prev, ...state } : prev;
    });
  }, []);

  const startGame = useCallback((difficulty: number) => {
    setGameStateInternal((prev) =>
      prev.isPlaying && prev.difficulty === difficulty && prev.currentAttempts === 0
        ? prev
        : {
            difficulty,
            currentAttempts: 0,
            maxAttempts: gameSettings.maxAttempts,
            isPlaying: true,
          }
    );
  }, []);

  const recordAttempt = useCallback(() => {
    setGameStateInternal((prev) => ({
      ...prev,
      currentAttempts: prev.currentAttempts + 1,
    }));
  }, []);

  const endGame = useCallback(() => {
    setGameStateInternal((prev) => (prev.isPlaying ? { ...prev, isPlaying: false } : prev));
  }, []);

  const value = useMemo(
    () => ({ gameState, setGameState, startGame, recordAttempt, endGame }),
    [gameState, setGameState, startGame, recordAttempt, endGame]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    // Return a default value when not wrapped in provider (for pages without game state)
    return {
      gameState: {
        difficulty: undefined,
        currentAttempts: 0,
        maxAttempts: gameSettings.maxAttempts,
        isPlaying: false,
      },
      setGameState: () => {},
      startGame: () => {},
      recordAttempt: () => {},
      endGame: () => {},
    };
  }
  return context;
}
