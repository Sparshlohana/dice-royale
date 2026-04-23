"use client";

import { useEffect, useState } from "react";
import { ModeSelectionScreen } from "@/components/ModeSelectionScreen";
import { OnlineRoomExperience } from "@/components/OnlineRoomExperience";
import { OnlineSetupScreen } from "@/components/OnlineSetupScreen";
import { useGameState } from "@/hooks/useGameState";
import { OnlineIdentity, PoolType } from "@/lib/types";
import {
  rollDice,
  processPlayerTurn,
  getNextPlayer,
  getFirstActivePlayerIndex,
  advanceRound,
  isGameOver,
} from "@/lib/gameLogic";
import { SetupScreen } from "@/components/SetupScreen";
import { PoolSelectionScreen } from "@/components/PoolSelectionScreen";
import { BettingScreen } from "@/components/BettingScreen";
import { GameBoard } from "@/components/GameBoard";
import { ResultsScreen } from "@/components/ResultsScreen";
import { Leaderboard } from "@/components/Leaderboard";

const ONLINE_IDENTITY_STORAGE_KEY = "diceLive_identity";

function RestartButton({ onRestart }: { onRestart: () => void }) {
  return (
    <button
      onClick={onRestart}
      className="button-ghost fixed right-4 top-4 z-50 px-4 py-2 text-sm sm:right-6 sm:top-6"
    >
      Restart
    </button>
  );
}

export default function Home() {
  const { gameState, setGameState, startNewGame, resetGame, isLoaded } =
    useGameState();
  const [isRolling, setIsRolling] = useState(false);
  const [mode, setMode] = useState<"menu" | "local" | "online">("menu");
  const [onlineIdentity, setOnlineIdentity] = useState<OnlineIdentity | null>(
    null,
  );
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [hasResolvedInitialView, setHasResolvedInitialView] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    try {
      const storedIdentity = localStorage.getItem(ONLINE_IDENTITY_STORAGE_KEY);
      if (storedIdentity) {
        setOnlineIdentity(JSON.parse(storedIdentity) as OnlineIdentity);
      }
    } catch (error) {
      console.error("Failed to restore online identity:", error);
    }

    const roomId = new URLSearchParams(window.location.search).get("room");
    setOnlineRoomId(roomId);

    if (roomId) {
      setMode("online");
    } else if (gameState) {
      setMode("local");
    } else {
      setMode("menu");
    }

    setHasResolvedInitialView(true);
  }, [isLoaded]);

  const persistOnlineIdentity = (identity: OnlineIdentity) => {
    setOnlineIdentity(identity);

    try {
      localStorage.setItem(ONLINE_IDENTITY_STORAGE_KEY, JSON.stringify(identity));
    } catch (error) {
      console.error("Failed to persist online identity:", error);
    }
  };

  const enterOnlineRoom = (roomId: string, identity: OnlineIdentity) => {
    persistOnlineIdentity(identity);
    setOnlineRoomId(roomId);
    setMode("online");
    window.history.replaceState({}, "", `/?room=${roomId}`);
  };

  const leaveOnlineRoom = () => {
    setOnlineRoomId(null);
    window.history.replaceState({}, "", "/");
    setMode(gameState ? "local" : "menu");
  };

  const startLocalGame = (playerNames: string[]) => {
    setMode("local");
    startNewGame(playerNames);
  };

  // Handle initial load
  if (!isLoaded || !hasResolvedInitialView) {
    return (
      <div className="screen-shell flex items-center justify-center">
        <div className="content-wrap max-w-md">
          <div className="glass-panel-strong rounded-[2rem] px-8 py-10 text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/15 border-t-cyan-300" />
            <p className="eyebrow mb-3">Preparing Table</p>
            <h1 className="title-display text-4xl text-white">Dice Royale</h1>
            <p className="muted mt-3 text-sm">Loading your saved match state.</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "online") {
    if (onlineRoomId && onlineIdentity) {
      return (
        <OnlineRoomExperience
          roomId={onlineRoomId}
          identity={onlineIdentity}
          onLeave={leaveOnlineRoom}
        />
      );
    }

    return (
      <OnlineSetupScreen
        initialRoomId={onlineRoomId}
        initialIdentity={onlineIdentity}
        onReady={enterOnlineRoom}
        onBack={() => setMode(gameState ? "local" : "menu")}
      />
    );
  }

  if (!gameState && mode === "menu") {
    return (
      <ModeSelectionScreen
        onSelectLocal={() => setMode("local")}
        onSelectOnline={() => setMode("online")}
      />
    );
  }

  // No game state - show setup screen
  if (!gameState) {
    return <SetupScreen onGameStart={startLocalGame} />;
  }

  // Setup screen
  if (gameState.gameStatus === "setup") {
    return <SetupScreen onGameStart={startLocalGame} />;
  }

  // Pool Selection
  if (gameState.gameStatus === "poolSelection") {
    const handlePoolSelected = (pool: PoolType) => {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].selected_pool = pool;
      setGameState({
        ...gameState,
        players: updatedPlayers,
        gameStatus: "playerBetting",
      });
    };
    return (
      <>
        <RestartButton onRestart={resetGame} />
        <PoolSelectionScreen
          gameState={gameState}
          onPoolSelected={handlePoolSelected}
        />
      </>
    );
  }

  // Player Betting
  if (gameState.gameStatus === "playerBetting") {
    const handleBetConfirmed = (bet: number) => {
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].current_round_bet = bet;
      setGameState({
        ...gameState,
        players: updatedPlayers,
        gameStatus: "rolling",
      });
    };
    return (
      <>
        <RestartButton onRestart={resetGame} />
        <BettingScreen
          gameState={gameState}
          onBetConfirmed={handleBetConfirmed}
        />
      </>
    );
  }

  // Rolling Phase
  if (gameState.gameStatus === "rolling") {
    const handleRoll = async () => {
      setIsRolling(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      const selectedPool = currentPlayer.selected_pool;
      const bet = currentPlayer.current_round_bet || 0;

      if (!selectedPool) {
        setIsRolling(false);
        return;
      }

      const diceRoll = rollDice();
      const result = processPlayerTurn(
        currentPlayer,
        selectedPool,
        bet,
        diceRoll,
      );

      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex].points = result.newPoints;
      if (result.eliminated) {
        updatedPlayers[gameState.currentPlayerIndex].status = "eliminated";
        updatedPlayers[gameState.currentPlayerIndex].eliminated_at_round =
          gameState.currentRound;
      }

      setGameState({
        ...gameState,
        players: updatedPlayers,
        lastDiceRoll: diceRoll,
        lastPlayerResult: result,
        gameStatus: "playerResults",
      });
      setIsRolling(false);
    };
    return (
      <>
        <RestartButton onRestart={resetGame} />
        <GameBoard
          gameState={gameState}
          isRolling={isRolling}
          onRoll={handleRoll}
        />
      </>
    );
  }

  // Player Results
  if (gameState.gameStatus === "playerResults") {
    const handleContinue = () => {
      const { nextIndex, isRoundComplete } = getNextPlayer(gameState);

      if (!isRoundComplete) {
        setGameState({
          ...gameState,
          currentPlayerIndex: nextIndex,
          gameStatus: "poolSelection",
        });
      } else {
        const firstActivePlayerIndex = Math.max(
          0,
          getFirstActivePlayerIndex(gameState.players),
        );
        const updatedGameState = {
          ...gameState,
          currentPlayerIndex: firstActivePlayerIndex,
          gameStatus: "roundComplete" as const,
        };
        if (isGameOver(updatedGameState)) {
          setGameState({
            ...updatedGameState,
            gameStatus: "gameOver",
          });
        } else {
          const nextRoundState = advanceRound(updatedGameState);
          setGameState(nextRoundState);
        }
      }
    };
    return (
      <>
        <RestartButton onRestart={resetGame} />
        <ResultsScreen gameState={gameState} onContinue={handleContinue} />
      </>
    );
  }

  // Game Over
  if (gameState.gameStatus === "gameOver") {
    return (
      <Leaderboard
        gameState={gameState}
        onPlayAgain={() => {
          resetGame();
          setMode("local");
        }}
        onResetGame={() => {
          resetGame();
          setMode("menu");
        }}
      />
    );
  }

  return null;
}
