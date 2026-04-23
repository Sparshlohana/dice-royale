"use client";

import { DiceRoll } from "@/lib/types";

interface DiceProps {
  roll: DiceRoll | null;
  isRolling: boolean;
}

export function Dice({ roll, isRolling }: DiceProps) {
  const die1 = roll?.die1 ?? 0;
  const die2 = roll?.die2 ?? 0;
  const sum = roll?.sum ?? 0;

  const pipMap: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  const renderDie = (value: number, delayClass = "") => {
    const pips = pipMap[value] ?? [];

    return (
      <div
        className={`
          relative grid h-24 w-24 grid-cols-3 grid-rows-3 gap-1 rounded-[1.75rem]
          border border-slate-300/80 bg-linear-to-br from-white via-slate-50 to-slate-200
          p-3 shadow-[0_18px_50px_rgba(15,23,42,0.28),inset_0_1px_0_rgba(255,255,255,0.95)]
          ${isRolling ? "animate-dice-tumble" : ""}
          ${delayClass}
        `}
      >
        <div className="pointer-events-none absolute inset-x-3 top-2 h-3 rounded-full bg-white/80 blur-sm" />
        {Array.from({ length: 9 }, (_, index) => {
          const pipIndex = index + 1;
          const isActive = pips.includes(pipIndex);

          return (
            <div key={pipIndex} className="flex items-center justify-center">
              <span
                className={`
                  h-3.5 w-3.5 rounded-full transition-all duration-200
                  ${isActive ? "scale-100 bg-slate-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]" : "scale-0 bg-transparent"}
                `}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex w-full flex-col items-center gap-6 py-4">
      <div className="flex gap-4 sm:gap-8">
        {renderDie(isRolling ? 5 : die1)}
        {renderDie(isRolling ? 4 : die2, "animation-delay-100")}
      </div>

      {!isRolling && roll && (
        <div className="animate-fade-in text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">
            Total
          </p>
          <div className="mt-2 text-6xl font-black text-cyan-300">{sum}</div>
          <p
            className={`mt-2 text-lg font-bold ${sum > 7 ? "text-emerald-300" : "text-rose-300"}`}
          >
            {sum > 7 ? "High side" : "Low side"}
          </p>
        </div>
      )}

      {isRolling && (
        <div className="animate-pulse text-sm font-semibold text-white/65">
          Rolling the table...
        </div>
      )}
    </div>
  );
}
