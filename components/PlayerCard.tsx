"use client";

import { Player } from "@/lib/types";

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer?: boolean;
  showBet?: boolean;
  betAmount?: number;
}

export function PlayerCard({
  player,
  isCurrentPlayer = false,
  showBet = false,
  betAmount = 0,
}: PlayerCardProps) {
  const isEliminated = player.status === "eliminated";

  return (
    <div
      className={`
        rounded-[1.5rem] border p-4 text-left transition-all duration-200
        ${isCurrentPlayer ? "border-cyan-300/50 bg-cyan-300/10 shadow-[0_0_0_3px_rgba(103,232,249,0.16)]" : "border-white/10 bg-white/[0.04]"}
        ${isEliminated ? "opacity-55 grayscale-[0.15]" : ""}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="truncate text-lg font-extrabold text-white">
            {player.name}
          </h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
            {isCurrentPlayer ? "Current turn" : "Waiting"}
          </p>
        </div>

        <span
          className={`
            inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]
            ${
              isEliminated
                ? "bg-rose-500/20 text-rose-200"
                : "bg-emerald-400/15 text-emerald-300"
            }
          `}
        >
          {isEliminated ? "Out" : "Active"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            Stack
          </p>
          <div className="mt-2 text-2xl font-extrabold text-cyan-300">
            {player.points}
            <span className="ml-1 text-xs text-white/45">pts</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
            Bet
          </p>
          <div className="mt-2 text-lg font-extrabold text-white">
            {showBet && betAmount > 0 ? betAmount : "--"}
          </div>
        </div>
      </div>
    </div>
  );
}
