"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useMutation, useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import { GameBoard } from "@/components/GameBoard";
import { BettingScreen } from "@/components/BettingScreen";
import { Leaderboard } from "@/components/Leaderboard";
import { PoolSelectionScreen } from "@/components/PoolSelectionScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import {
  advanceRound,
  getFirstActivePlayerIndex,
  getNextPlayer,
  initializeGameFromPlayers,
  isGameOver,
  processPlayerTurn,
  rollDice,
} from "@/lib/gameLogic";
import { OnlineIdentity, PoolType, SharedRoomState } from "@/lib/types";

interface OnlineRoomExperienceProps {
  roomId: string;
  identity: OnlineIdentity;
  onLeave: () => void;
}

interface LiveParticipant {
  userId: string;
  name: string;
  isHost: boolean;
}

function createInitialRoomState(
  roomId: string,
  identity: OnlineIdentity,
): SharedRoomState {
  return {
    roomId,
    hostUserId: identity.userId,
    hostName: identity.name,
    stage: "lobby",
    gameState: null,
    createdAt: 0,
  };
}

async function copyText(value: string) {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is not available.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function parseRoomState(serialized: string | null): SharedRoomState | null {
  if (!serialized) {
    return null;
  }

  return JSON.parse(serialized) as SharedRoomState;
}

function OnlineRoomContent({
  roomId,
  identity,
  onLeave,
}: OnlineRoomExperienceProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [roomError, setRoomError] = useState("");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const serializedRoomState = useStorage(
    (root) => (root as { roomState?: string }).roomState ?? null,
  );
  const roomState = useMemo(
    () => parseRoomState(serializedRoomState),
    [serializedRoomState],
  );
  const self = useSelf((me) => ({
    userId: String(me.id),
    name: ((me.info as { name?: string } | undefined)?.name ?? identity.name) as string,
    isHost: Boolean((me.info as { isHost?: boolean } | undefined)?.isHost),
  }));
  const others = useOthers((liveOthers) =>
    liveOthers.map((other) => ({
      userId: String(other.id),
      name: ((other.info as { name?: string } | undefined)?.name ?? "Player") as string,
      isHost: Boolean((other.info as { isHost?: boolean } | undefined)?.isHost),
    })),
  );

  const participants = useMemo(() => {
    const byId = new Map<string, LiveParticipant>();

    for (const participant of [self, ...others]) {
      byId.set(participant.userId, participant);
    }

    return Array.from(byId.values()).sort((left, right) => {
      if (left.isHost && !right.isHost) return -1;
      if (!left.isHost && right.isHost) return 1;
      return left.name.localeCompare(right.name);
    });
  }, [others, self]);

  const updateSerializedRoomState = useMutation(
    ({ storage }, nextState: SharedRoomState) => {
      storage.set("roomState", JSON.stringify(nextState));
    },
    [],
  );

  const startGame = useMutation(
    ({ storage }, currentParticipants: LiveParticipant[]) => {
      const serialized = storage.get("roomState");
      if (typeof serialized !== "string") {
        return;
      }

      const currentState = parseRoomState(serialized);
      if (!currentState || currentState.hostUserId !== identity.userId) {
        return;
      }

      const uniquePlayers = currentParticipants.map((participant) => ({
        id: participant.userId,
        name: participant.name,
      }));

      const nextState: SharedRoomState = {
        ...currentState,
        stage: "playing",
        gameState: initializeGameFromPlayers(uniquePlayers),
      };

      storage.set("roomState", JSON.stringify(nextState));
    },
    [identity.userId],
  );

  const selectPool = useMutation(
    ({ storage }, pool: PoolType) => {
      const serialized = storage.get("roomState");
      if (typeof serialized !== "string") {
        return;
      }

      const currentState = parseRoomState(serialized);
      const gameState = currentState?.gameState;
      if (!currentState || !gameState || gameState.gameStatus !== "poolSelection") {
        return;
      }

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id !== identity.userId) {
        return;
      }

      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        selected_pool: pool,
      };

      storage.set(
        "roomState",
        JSON.stringify({
          ...currentState,
          gameState: {
            ...gameState,
            players: updatedPlayers,
            gameStatus: "playerBetting",
          },
        } satisfies SharedRoomState),
      );
    },
    [identity.userId],
  );

  const confirmBet = useMutation(
    ({ storage }, bet: number) => {
      const serialized = storage.get("roomState");
      if (typeof serialized !== "string") {
        return;
      }

      const currentState = parseRoomState(serialized);
      const gameState = currentState?.gameState;
      if (!currentState || !gameState || gameState.gameStatus !== "playerBetting") {
        return;
      }

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id !== identity.userId) {
        return;
      }

      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...currentPlayer,
        current_round_bet: bet,
      };

      storage.set(
        "roomState",
        JSON.stringify({
          ...currentState,
          gameState: {
            ...gameState,
            players: updatedPlayers,
            gameStatus: "rolling",
          },
        } satisfies SharedRoomState),
      );
    },
    [identity.userId],
  );

  const finishRoll = useMutation(
    ({ storage }) => {
      const serialized = storage.get("roomState");
      if (typeof serialized !== "string") {
        return;
      }

      const currentState = parseRoomState(serialized);
      const gameState = currentState?.gameState;
      if (!currentState || !gameState || gameState.gameStatus !== "rolling") {
        return;
      }

      const currentPlayer = gameState.players[gameState.currentPlayerIndex];
      if (!currentPlayer || currentPlayer.id !== identity.userId) {
        return;
      }

      const selectedPool = currentPlayer.selected_pool;
      const bet = currentPlayer.current_round_bet || 0;
      if (!selectedPool) {
        return;
      }

      const diceRoll = rollDice();
      const result = processPlayerTurn(currentPlayer, selectedPool, bet, diceRoll);
      const updatedPlayers = [...gameState.players];
      updatedPlayers[gameState.currentPlayerIndex] = {
        ...updatedPlayers[gameState.currentPlayerIndex],
        points: result.newPoints,
        status: result.eliminated ? "eliminated" : updatedPlayers[gameState.currentPlayerIndex].status,
        eliminated_at_round: result.eliminated ? gameState.currentRound : updatedPlayers[gameState.currentPlayerIndex].eliminated_at_round,
      };

      storage.set(
        "roomState",
        JSON.stringify({
          ...currentState,
          gameState: {
            ...gameState,
            players: updatedPlayers,
            lastDiceRoll: diceRoll,
            lastPlayerResult: result,
            gameStatus: "playerResults",
          },
        } satisfies SharedRoomState),
      );
    },
    [identity.userId],
  );

  const continueTurn = useMutation(
    ({ storage }) => {
      const serialized = storage.get("roomState");
      if (typeof serialized !== "string") {
        return;
      }

      const currentState = parseRoomState(serialized);
      const gameState = currentState?.gameState;
      if (!currentState || !gameState || gameState.gameStatus !== "playerResults") {
        return;
      }

      const { nextIndex, isRoundComplete } = getNextPlayer(gameState);

      if (!isRoundComplete) {
        storage.set(
          "roomState",
          JSON.stringify({
            ...currentState,
            gameState: {
              ...gameState,
              currentPlayerIndex: nextIndex,
              gameStatus: "poolSelection",
            },
          } satisfies SharedRoomState),
        );
        return;
      }

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
        storage.set(
          "roomState",
          JSON.stringify({
            ...currentState,
            gameState: {
              ...updatedGameState,
              gameStatus: "gameOver",
            },
          } satisfies SharedRoomState),
        );
        return;
      }

      storage.set(
        "roomState",
        JSON.stringify({
          ...currentState,
          gameState: advanceRound(updatedGameState),
        } satisfies SharedRoomState),
      );
    },
    [],
  );

  const restartRoom = useMutation(
    ({ storage }) => {
      const serialized = storage.get("roomState");
      if (typeof serialized !== "string") {
        return;
      }

      const currentState = parseRoomState(serialized);
      if (!currentState || currentState.hostUserId !== identity.userId) {
        return;
      }

      storage.set(
        "roomState",
        JSON.stringify({
          ...currentState,
          stage: "lobby",
          gameState: null,
        } satisfies SharedRoomState),
      );
    },
    [identity.userId],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  if (!roomState) {
    return (
      <div className="screen-shell flex items-center justify-center">
        <div className="glass-panel rounded-[2rem] px-6 py-5">
          <p className="text-sm font-semibold text-white">Loading room...</p>
        </div>
      </div>
    );
  }

  const inviteLink = origin ? `${origin}/?room=${roomId}` : `/?room=${roomId}`;
  const gameState = roomState.gameState;
  const currentPlayer =
    gameState?.players[gameState.currentPlayerIndex] ?? null;
  const isCurrentPlayersTurn = currentPlayer?.id === self.userId;
  const waitingMessage = currentPlayer
    ? `Waiting for ${currentPlayer.name} to play from their device.`
    : "Waiting for the next player.";

  const handleRoll = async () => {
    if (!isCurrentPlayersTurn || isRolling) {
      return;
    }

    setIsRolling(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    finishRoll();
    setIsRolling(false);
  };

  const handleCloseRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: identity.userId,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Unable to close room.");
      }

      onLeave();
    } catch (closeError) {
      setRoomError(
        closeError instanceof Error ? closeError.message : "Unable to close room.",
      );
    }
  };

  const topRightControls = (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 sm:right-6 sm:top-6 sm:flex-row">
      {roomState.stage === "playing" && self.isHost ? (
        <button
          onClick={restartRoom}
          className="button-ghost px-4 py-2 text-sm"
        >
          Restart room
        </button>
      ) : null}
      <button
        onClick={async () => {
          try {
            await copyText(inviteLink);
            setCopied(true);
            setRoomError("");
          } catch (copyError) {
            setRoomError(
              copyError instanceof Error
                ? copyError.message
                : "Unable to copy invite link.",
            );
          }
        }}
        className="button-ghost px-4 py-2 text-sm"
      >
        {copied ? "Copied" : "Copy invite"}
      </button>
      <button onClick={onLeave} className="button-ghost px-4 py-2 text-sm">
        Leave room
      </button>
      {self.isHost ? (
        <button
          onClick={handleCloseRoom}
          className="button-secondary px-4 py-2 text-sm"
        >
          End room
        </button>
      ) : null}
    </div>
  );

  if (roomState.stage === "lobby") {
    return (
      <>
        {topRightControls}
        <div className="screen-shell flex items-center">
          <div className="content-wrap grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="glass-panel-strong rounded-[2rem] p-8 sm:p-10">
              <p className="eyebrow mb-4">Live room</p>
              <h1 className="text-5xl font-extrabold text-white">Lobby</h1>
              <p className="muted mt-4 text-base leading-7">
                Share the invite link, wait for players to join, then the host
                starts the room once at least two players are connected.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Invite link
                </p>
                <p className="mt-3 break-all text-sm font-semibold text-cyan-200">
                  {inviteLink}
                </p>
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="eyebrow mb-2">Players</p>
                  <h2 className="text-3xl font-extrabold text-white">
                    {participants.length} connected
                  </h2>
                </div>
                <div className="metric-card min-w-[110px] text-center">
                  <p className="muted text-xs uppercase tracking-[0.24em]">
                    Host
                  </p>
                  <p className="mt-2 text-lg font-extrabold text-cyan-300">
                    {roomState.hostName}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.userId}
                    className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-semibold text-white">
                        {participant.name}
                      </p>
                      <span className="rounded-full bg-cyan-300/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                        {participant.isHost ? "Host" : "Player"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {self.isHost ? (
                <button
                  onClick={() => startGame(participants)}
                  disabled={participants.length < 2}
                  className="button-primary mt-6 w-full px-5 py-4 text-lg"
                >
                  Start room
                </button>
              ) : (
                <div className="mt-6 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-4">
                  <p className="text-sm font-semibold text-cyan-100">
                    Waiting for the host to start the room.
                  </p>
                </div>
              )}

              {roomError ? (
                <div className="mt-4 rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3">
                  <p className="text-sm font-semibold text-rose-200">
                    {roomError}
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </>
    );
  }

  if (!gameState) {
    return (
      <>
        {topRightControls}
        <div className="screen-shell flex items-center justify-center">
          <div className="glass-panel rounded-[2rem] px-6 py-5">
            <p className="text-sm font-semibold text-white">
              Syncing room state...
            </p>
          </div>
        </div>
      </>
    );
  }

  const onlineBanner = (
    <>
      {topRightControls}
      <div className="fixed left-4 top-4 z-40 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200 backdrop-blur sm:left-6 sm:top-6">
        Room {roomId.slice(0, 12)}
      </div>
    </>
  );

  if (gameState.gameStatus === "poolSelection") {
    return (
      <>
        {onlineBanner}
        <PoolSelectionScreen
          gameState={gameState}
          onPoolSelected={selectPool}
          disabled={!isCurrentPlayersTurn}
          statusMessage={!isCurrentPlayersTurn ? waitingMessage : "Your turn. Pick a pool from your device."}
        />
      </>
    );
  }

  if (gameState.gameStatus === "playerBetting") {
    return (
      <>
        {onlineBanner}
        <BettingScreen
          gameState={gameState}
          onBetConfirmed={confirmBet}
          disabled={!isCurrentPlayersTurn}
          statusMessage={!isCurrentPlayersTurn ? waitingMessage : "Your turn. Lock the wager from your device."}
        />
      </>
    );
  }

  if (gameState.gameStatus === "rolling") {
    return (
      <>
        {onlineBanner}
        <GameBoard
          gameState={gameState}
          isRolling={isRolling}
          onRoll={handleRoll}
          canRoll={isCurrentPlayersTurn}
          statusMessage={!isCurrentPlayersTurn ? waitingMessage : "Your turn. Roll the dice from your device."}
        />
      </>
    );
  }

  if (gameState.gameStatus === "playerResults") {
    return (
      <>
        {onlineBanner}
        <ResultsScreen gameState={gameState} onContinue={continueTurn} />
      </>
    );
  }

  if (gameState.gameStatus === "gameOver") {
    return (
      <>
        {onlineBanner}
        <Leaderboard
          gameState={gameState}
          onPlayAgain={self.isHost ? restartRoom : () => {}}
          onResetGame={onLeave}
        />
      </>
    );
  }

  return null;
}

export function OnlineRoomExperience(props: OnlineRoomExperienceProps) {
  const { roomId, identity } = props;

  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room,
            userId: identity.userId,
            name: identity.name,
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Unable to authenticate room.");
        }

        return await response.json();
      }}
    >
      <RoomProvider
        id={roomId}
        initialPresence={{
          userId: identity.userId,
          name: identity.name,
        }}
        initialStorage={{
          roomState: JSON.stringify(createInitialRoomState(roomId, identity)),
        }}
      >
        <ClientSideSuspense
          fallback={
            <div className="screen-shell flex items-center justify-center">
              <div className="glass-panel rounded-[2rem] px-6 py-5">
                <p className="text-sm font-semibold text-white">
                  Joining live room...
                </p>
              </div>
            </div>
          }
        >
          <OnlineRoomContent {...props} />
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
