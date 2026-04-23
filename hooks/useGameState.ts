"use client";

import { useEffect, useState, useCallback } from "react";
import { GameState, GameStatus } from "@/lib/types";
import { initializeGame } from "@/lib/gameLogic";

const STORAGE_KEY = "diceGame_state";

/**
 * Hook for managing game state with localStorage persistence
 */
export function useGameState() {
  const [gameState, setGameStateInternal] = useState<GameState | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const loadGameState = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as GameState;
          setGameStateInternal(parsed);
        }
        setIsLoaded(true);
      } catch (error) {
        console.error("Failed to load game state from localStorage:", error);
        setIsLoaded(true);
      }
    };

    // Only run on client
    if (typeof window !== "undefined") {
      loadGameState();
    }
  }, []);

  // Save to localStorage on every state change
  const setGameState = useCallback(
    (newState: GameState | ((prev: GameState | null) => GameState)) => {
      setGameStateInternal((prevState) => {
        const updated =
          typeof newState === "function" ? newState(prevState) : newState;

        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
          console.error("Failed to save game state to localStorage:", error);
        }

        return updated;
      });
    },
    [],
  );

  // Initialize a new game
  const startNewGame = useCallback(
    (playerNames: string[]) => {
      const newGame = initializeGame(playerNames);
      setGameState(newGame);
    },
    [setGameState],
  );

  // Reset game (clear localStorage and state)
  const resetGame = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
    setGameStateInternal(null);
  }, []);

  return {
    gameState,
    setGameState,
    startNewGame,
    resetGame,
    isLoaded,
  };
}
