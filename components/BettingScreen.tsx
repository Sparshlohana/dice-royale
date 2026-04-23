"use client";

import { useState } from "react";
import { GameState } from "@/lib/types";
import { getPoolInfo } from "@/lib/gameLogic";

interface BettingScreenProps {
  gameState: GameState;
  onBetConfirmed: (bet: number) => void;
  disabled?: boolean;
  statusMessage?: string;
}

export function BettingScreen({
  gameState,
  onBetConfirmed,
  disabled = false,
  statusMessage,
}: BettingScreenProps) {
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const poolType = currentPlayer?.selected_pool;
  const [bet, setBet] = useState<number>(0);
  const [error, setError] = useState<string>("");

  if (!currentPlayer || !poolType) {
    return <div>Error loading player or pool</div>;
  }

  const pool = getPoolInfo(poolType);

  const handleBetChange = (value: number) => {
    setBet(value);
    setError("");

    if (value <= 0) {
      setError("Bet must be greater than 0");
    } else if (value > currentPlayer.points) {
      setError(
        `Bet cannot exceed your current points (${currentPlayer.points})`,
      );
    }
  };

  const handleConfirm = () => {
    if (bet <= 0) {
      setError("Bet must be greater than 0");
      return;
    }
    if (bet > currentPlayer.points) {
      setError(
        `Bet cannot exceed your current points (${currentPlayer.points})`,
      );
      return;
    }
    onBetConfirmed(bet);
  };

  const isValid = bet > 0 && bet <= currentPlayer.points;

  return (
    <div className="screen-shell flex items-center">
      <div className="content-wrap max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="glass-panel-strong rounded-[2rem] p-6 sm:p-8">
            <p className="eyebrow mb-3">Round {gameState.currentRound} of 10</p>
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl">
              Set the wager
            </h1>
            <p className="muted mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              {currentPlayer.name} is locked into {pool.name}. Enter a stake
              that fits the current stack and confirm the turn.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="metric-card">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Selected pool
                </p>
                <p className="mt-3 text-2xl font-extrabold text-white">
                  {pool.name}
                </p>
                <p className="mt-2 text-sm text-cyan-300">Range {pool.range}</p>
              </div>
              <div className="metric-card">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Available points
                </p>
                <p className="mt-3 text-4xl font-extrabold text-cyan-300">
                  {currentPlayer.points}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                Bet amount
              </label>
          <input
            type="number"
            min="1"
            max={currentPlayer.points}
            placeholder="0"
            value={bet || ""}
            onChange={(e) => handleBetChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="field-input text-2xl font-extrabold"
          />
            </div>
          </section>

          <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Win projection
              </p>
              <p className="mt-3 text-4xl font-extrabold text-emerald-300">
                {bet > 0 && !error ? `+${Math.floor(bet * pool.multiplier)}` : "--"}
              </p>
              <p className="muted mt-2 text-sm">At {pool.multiplier}x payout</p>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 p-5">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Loss exposure
              </p>
              <p className="mt-3 text-4xl font-extrabold text-rose-300">
                {bet > 0 ? `-${bet}` : "--"}
              </p>
              <p className="muted mt-2 text-sm">If the roll misses your range</p>
            </div>

            {error && (
              <div className="mt-4 rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-rose-200">{error}</p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!isValid || disabled}
              className="button-primary mt-6 w-full px-5 py-4 text-lg"
            >
              Confirm bet
            </button>

            {statusMessage ? (
              <div className="mt-4 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
                <p className="text-sm font-semibold text-cyan-100">
                  {statusMessage}
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
