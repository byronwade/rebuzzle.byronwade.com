"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
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

  const setGameState = useCallback((state: Partial<GameStateContext>) => {
    setGameStateInternal((prev) => ({ ...prev, ...state }));
  }, []);

  const startGame = useCallback((difficulty: number) => {
    setGameStateInternal({
      difficulty,
      currentAttempts: 0,
      maxAttempts: gameSettings.maxAttempts,
      isPlaying: true,
    });
  }, []);

  const recordAttempt = useCallback(() => {
    setGameStateInternal((prev) => ({
      ...prev,
      currentAttempts: prev.currentAttempts + 1,
    }));
  }, []);

  const endGame = useCallback(() => {
    setGameStateInternal((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  }, []);

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        startGame,
        recordAttempt,
        endGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
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
