"use client";

import { useState } from "react";
import { GameState, Player, PlayerTurnResult } from "@/lib/types";
import { getLeaderboard, getPoolInfo } from "@/lib/gameLogic";

interface ScoreBoardProps {
  gameState: GameState;
}

// What the player "with the chance" (current turn) is doing right now.
// Lets spectators understand the live action instead of staring at a
// disabled control or a bare "waiting" message.
function getTurnAction(gameState: GameState): string {
  const player = gameState.players[gameState.currentPlayerIndex];
  if (!player) {
    return "";
  }

  switch (gameState.gameStatus) {
    case "poolSelection":
      return "Choosing a pool";
    case "playerBetting":
      return player.selected_pool
        ? `Picked ${getPoolInfo(player.selected_pool).name} — setting bet`
        : "Setting the bet";
    case "rolling":
      return player.selected_pool
        ? `Bet ${player.current_round_bet ?? 0} on ${getPoolInfo(player.selected_pool).name} — rolling`
        : "Rolling the dice";
    case "playerResults":
      return "Reviewing the result";
    default:
      return "";
  }
}

function poolLabel(player: Player): string {
  return player.selected_pool ? getPoolInfo(player.selected_pool).name : "—";
}

export function ScoreBoard({ gameState }: ScoreBoardProps) {
  const [showStats, setShowStats] = useState(false);
  const leaderboard = getLeaderboard(gameState.players);
  const activePlayer = gameState.players[gameState.currentPlayerIndex] ?? null;
  const turnAction = getTurnAction(gameState);

  return (
    <>
      <button
        type="button"
        onClick={() => setShowStats(true)}
        className="mt-6 w-full rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-200 hover:border-cyan-300/40 hover:bg-cyan-300/8"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/55">
            Scores
          </p>
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            Tap for full stats
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {leaderboard.map((player) => {
            const isActive = player.id === activePlayer?.id;
            const isEliminated = player.status === "eliminated";
            return (
              <div
                key={player.id}
                className={`
                  flex min-w-[120px] flex-shrink-0 flex-col gap-1 rounded-2xl border px-3 py-2
                  ${isActive ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/8 bg-black/10"}
                  ${isEliminated ? "opacity-55" : ""}
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-white/45">
                    #{player.rank}
                  </span>
                  {isActive ? (
                    <span className="rounded-full bg-cyan-300/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                      Turn
                    </span>
                  ) : isEliminated ? (
                    <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-rose-200">
                      Out
                    </span>
                  ) : null}
                </div>
                <span className="truncate text-sm font-extrabold text-white">
                  {player.name}
                </span>
                <span className="text-lg font-extrabold text-cyan-300">
                  {player.points}
                  <span className="ml-1 text-[10px] text-white/40">pts</span>
                </span>
              </div>
            );
          })}
        </div>

        {activePlayer && turnAction ? (
          <p className="mt-3 text-xs font-semibold text-cyan-100">
            <span className="text-white">{activePlayer.name}</span> has the
            chance · {turnAction}
          </p>
        ) : null}
      </button>

      {showStats ? (
        <StatsModal gameState={gameState} onClose={() => setShowStats(false)} />
      ) : null}
    </>
  );
}

interface StatsModalProps {
  gameState: GameState;
  onClose: () => void;
}

function StatsModal({ gameState, onClose }: StatsModalProps) {
  const [tab, setTab] = useState<"standings" | "history">("history");
  const leaderboard = getLeaderboard(gameState.players);
  const activePlayer = gameState.players[gameState.currentPlayerIndex] ?? null;

  // Group every recorded turn by round, latest round first.
  const history = gameState.turnHistory ?? [];
  const rounds = new Map<number, PlayerTurnResult[]>();
  for (const turn of history) {
    const bucket = rounds.get(turn.round);
    if (bucket) {
      bucket.push(turn);
    } else {
      rounds.set(turn.round, [turn]);
    }
  }
  const roundNumbers = Array.from(rounds.keys()).sort((a, b) => b - a);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="glass-panel-strong max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] p-6 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Round {gameState.currentRound} of 10</p>
            <h2 className="text-3xl font-extrabold text-white">Game stats</h2>
            {activePlayer ? (
              <p className="muted mt-2 text-sm">
                <span className="font-semibold text-cyan-200">
                  {activePlayer.name}
                </span>{" "}
                has the chance this turn.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="button-ghost px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
              tab === "history"
                ? "bg-cyan-300/20 text-cyan-100"
                : "bg-white/5 text-white/55 hover:text-white"
            }`}
          >
            Turn history
          </button>
          <button
            type="button"
            onClick={() => setTab("standings")}
            className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
              tab === "standings"
                ? "bg-cyan-300/20 text-cyan-100"
                : "bg-white/5 text-white/55 hover:text-white"
            }`}
          >
            Standings
          </button>
        </div>

        {tab === "standings" ? (
          <div className="space-y-3">
            {leaderboard.map((player) => {
              const isActive = player.id === activePlayer?.id;
              const isEliminated = player.status === "eliminated";
              return (
                <div
                  key={player.id}
                  className={`
                    rounded-[1.5rem] border p-4
                    ${isActive ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"}
                    ${isEliminated ? "opacity-65" : ""}
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-black
                          ${player.rank === 1 ? "bg-amber-300 text-slate-900" : "bg-white/10 text-white"}
                        `}
                      >
                        {player.rank}
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-white">
                          {player.name}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                          {isEliminated ? "Eliminated" : "Active"}
                          {isActive ? " · Turn" : ""}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-extrabold text-cyan-300">
                      {player.points}
                      <span className="ml-1 text-xs text-white/40">pts</span>
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                        Pool
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-white">
                        {poolLabel(player)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                        Bet
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-white">
                        {player.current_round_bet && player.current_round_bet > 0
                          ? player.current_round_bet
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                        Out at
                      </p>
                      <p className="mt-1 text-sm font-extrabold text-white">
                        {player.eliminated_at_round
                          ? `R${player.eliminated_at_round}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : roundNumbers.length === 0 ? (
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="muted text-sm">No turns played yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {roundNumbers.map((roundNo) => (
              <div key={roundNo}>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
                  Round {roundNo}
                </p>
                <div className="space-y-2">
                  {(rounds.get(roundNo) ?? []).map((turn, idx) => {
                    const pool = getPoolInfo(turn.selectedPool);
                    return (
                      <div
                        key={`${turn.playerId}-${roundNo}-${idx}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/10 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-white">
                            {turn.playerName}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-white/50">
                            {pool.name} · bet {turn.bet} · rolled {turn.diceSum}
                            {turn.eliminated ? " · eliminated" : ""}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                              turn.won
                                ? "bg-emerald-400/15 text-emerald-300"
                                : "bg-rose-500/15 text-rose-300"
                            }`}
                          >
                            {turn.won ? "Won" : "Lost"}
                          </span>
                          <div className="text-right">
                            <p
                              className={`text-sm font-extrabold ${
                                turn.pointsChange >= 0
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                              }`}
                            >
                              {turn.pointsChange > 0 ? "+" : ""}
                              {turn.pointsChange}
                            </p>
                            <p className="text-[10px] font-semibold text-white/40">
                              → {turn.newPoints}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
