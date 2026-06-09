"use client";

import { useEffect, useState } from "react";
import { GameState } from "@/lib/types";
import { Dice } from "./Dice";
import { getPoolInfo } from "@/lib/gameLogic";
import { ScoreBoard } from "./ScoreBoard";

interface ResultsScreenProps {
  gameState: GameState;
  onContinue: () => void;
  // Only the player whose turn it is may advance. Defaults to true for the
  // local hot-seat game where one device controls every turn.
  canAdvance?: boolean;
  waitingMessage?: string;
}

// Seconds players must view the result before continuing — keeps pace
// from feeling rushed and lets everyone read the outcome.
const CONTINUE_DELAY_SECONDS = 2;

export function ResultsScreen({
  gameState,
  onContinue,
  canAdvance = true,
  waitingMessage,
}: ResultsScreenProps) {
  const result = gameState.lastPlayerResult;
  const roll = gameState.lastDiceRoll;
  const [countdown, setCountdown] = useState(CONTINUE_DELAY_SECONDS);

  useEffect(() => {
    setCountdown(CONTINUE_DELAY_SECONDS);
    const interval = setInterval(() => {
      setCountdown((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [result?.playerId, result?.newPoints]);

  if (!result || !roll) {
    return <div>Error loading result</div>;
  }

  const timerReady = countdown <= 0;
  const canContinue = timerReady && canAdvance;

  const pool = getPoolInfo(result.selectedPool);

  return (
    <div className="screen-shell flex items-center">
      <div className="content-wrap max-w-5xl">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
            <p className="eyebrow mb-3">Round {gameState.currentRound} result</p>
            <h1 className="text-4xl font-extrabold text-white">
              {result.playerName}
            </h1>
            <p className="muted mt-2 text-sm leading-6">
              The roll is in. Review the outcome and move to the next seat.
            </p>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/10 p-4">
              <Dice roll={roll} isRolling={false} />
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="muted text-xs uppercase tracking-[0.24em]">
                Selected pool
              </p>
              <p className="mt-2 text-xl font-extrabold text-white">
                {pool.name} ({pool.range})
              </p>
            </div>
          </section>

          <section
            className={`
              glass-panel-strong rounded-[2rem] p-6 sm:p-8
              ${result.won ? "border border-emerald-400/25" : "border border-rose-400/25"}
            `}
          >
            <p className="eyebrow mb-3">{result.won ? "Winning hand" : "Missed hand"}</p>
            <h2
              className={`text-4xl font-extrabold ${
                result.won ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {result.won ? "Stack increased" : "Stack dropped"}
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="metric-card">
                <p className="muted text-xs uppercase tracking-[0.24em]">Bet</p>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  {result.bet}
                </p>
              </div>
              <div className="metric-card">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Multiplier
                </p>
                <p className="mt-3 text-3xl font-extrabold text-cyan-300">
                  {result.multiplier}x
                </p>
              </div>
              <div className="metric-card">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  Previous
                </p>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  {result.previousPoints}
                </p>
              </div>
              <div className="metric-card">
                <p className="muted text-xs uppercase tracking-[0.24em]">
                  New stack
                </p>
                <p className="mt-3 text-3xl font-extrabold text-cyan-300">
                  {result.newPoints}
                </p>
              </div>
            </div>

            <div
              className={`
                mt-4 rounded-[1.5rem] px-5 py-4
                ${result.won ? "bg-emerald-400/10 text-emerald-200" : "bg-rose-500/10 text-rose-200"}
              `}
            >
              <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-70">
                Net change
              </p>
              <p className="mt-2 text-4xl font-extrabold">
                {result.pointsChange > 0 ? "+" : ""}
                {result.pointsChange}
              </p>
            </div>

            {result.eliminated && (
              <div className="mt-4 rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-4">
                <p className="text-lg font-extrabold text-rose-200">
                  Player eliminated
                </p>
                <p className="mt-1 text-sm text-rose-100/80">
                  Their stack hit zero or below in this round.
                </p>
              </div>
            )}

            <button
              onClick={onContinue}
              disabled={!canContinue}
              className="button-primary mt-6 w-full px-5 py-4 text-lg"
            >
              {!canAdvance
                ? "Waiting for player"
                : timerReady
                  ? "Continue"
                  : `Continue in ${countdown}s`}
            </button>

            {!canAdvance && waitingMessage ? (
              <div className="mt-4 rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3">
                <p className="text-sm font-semibold text-cyan-100">
                  {waitingMessage}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <ScoreBoard gameState={gameState} />
      </div>
    </div>
  );
}
