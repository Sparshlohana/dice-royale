"use client";

import type { CSSProperties } from "react";
import { DiceRoll } from "@/lib/types";

interface DiceProps {
  roll: DiceRoll | null;
  isRolling: boolean;
}

// Grid positions (1-9) lit for each face value.
const PIP_MAP: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

// Cube geometry kept inline (not CSS) so Turbopack's CSS cache can't serve a
// stale face depth. Half-edge = CUBE_SIZE / 2.
const CUBE_SIZE = "4.25rem";
const HALF = "2.125rem";

const CUBE_FACES: Array<{ side: string; value: number; transform: string }> = [
  { side: "dice-face-front", value: 1, transform: `rotateY(0deg) translateZ(${HALF})` },
  { side: "dice-face-back", value: 6, transform: `rotateY(180deg) translateZ(${HALF})` },
  { side: "dice-face-right", value: 3, transform: `rotateY(90deg) translateZ(${HALF})` },
  { side: "dice-face-left", value: 4, transform: `rotateY(-90deg) translateZ(${HALF})` },
  { side: "dice-face-top", value: 2, transform: `rotateX(90deg) translateZ(${HALF})` },
  { side: "dice-face-bottom", value: 5, transform: `rotateX(-90deg) translateZ(${HALF})` },
];

// Resting rotation that brings each rolled value to the dominant FRONT face,
// then a gentle tilt so the cube reads as 3D without hiding the value.
// Layout: front:1 back:6 right:3 left:4 top:2 bottom:5 (opposite faces = 7).
const VIEW_TILT = "rotateX(-20deg) rotateY(-20deg)";
const REST_TRANSFORM: Record<number, string> = {
  1: `${VIEW_TILT}`,
  2: `${VIEW_TILT} rotateX(90deg)`,
  3: `${VIEW_TILT} rotateY(-90deg)`,
  4: `${VIEW_TILT} rotateY(90deg)`,
  5: `${VIEW_TILT} rotateX(-90deg)`,
  6: `${VIEW_TILT} rotateY(180deg)`,
};

function PipGrid({ value }: { value: number }) {
  const pips = PIP_MAP[value] ?? [];
  return (
    <>
      {Array.from({ length: 9 }, (_, index) => {
        const position = index + 1;
        return (
          <span key={position} className="flex items-center justify-center">
            {pips.includes(position) ? <span className="dice-pip" /> : null}
          </span>
        );
      })}
    </>
  );
}

// 3D die cube. While rolling it spins; at rest it rotates to land the rolled
// value on the dominant front face.
function DieCube({
  value,
  isRolling,
  alt = false,
}: {
  value: number;
  isRolling: boolean;
  alt?: boolean;
}) {
  const rollingClass = isRolling ? (alt ? "is-rolling-alt" : "is-rolling") : "";
  // Geometry + settle easing inline so nothing depends on cached CSS.
  const settle = "transform 0.7s cubic-bezier(0.2, 0.85, 0.3, 1.1)";
  const cubeStyle: CSSProperties = {
    width: CUBE_SIZE,
    height: CUBE_SIZE,
    transformStyle: "preserve-3d",
    transition: settle,
    // While rolling, leave transform to the keyframe animation.
    ...(isRolling ? {} : { transform: REST_TRANSFORM[value] }),
  };
  return (
    <div className="dice-stage">
      <div className={`dice-cube ${rollingClass}`} style={cubeStyle}>
        {CUBE_FACES.map((face) => (
          <div
            key={face.side}
            className={`dice-face ${face.side}`}
            style={{ transform: face.transform }}
          >
            <PipGrid value={face.value} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Dice({ roll, isRolling }: DiceProps) {
  const die1 = roll?.die1 ?? 1;
  const die2 = roll?.die2 ?? 1;
  const sum = roll?.sum ?? 0;

  return (
    <div className="flex w-full flex-col items-center gap-6 py-3">
      <div className="flex items-center justify-center gap-8 sm:gap-10">
        <DieCube value={die1} isRolling={isRolling} />
        <DieCube value={die2} isRolling={isRolling} alt />
      </div>

      {!isRolling && roll ? (
        <div className="animate-fade-in flex flex-col items-center text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">
            Total
          </p>
          <div className="mt-1 text-5xl font-black text-cyan-300">{sum}</div>
          <span
            className={`mt-2 rounded-full px-4 py-1 text-sm font-bold ${
              sum > 7
                ? "bg-emerald-400/15 text-emerald-300"
                : sum === 7
                  ? "bg-amber-400/15 text-amber-300"
                  : "bg-rose-500/15 text-rose-300"
            }`}
          >
            {sum > 7 ? "High side" : sum === 7 ? "Lucky seven" : "Low side"}
          </span>
        </div>
      ) : null}

      {isRolling ? (
        <div className="animate-pulse text-sm font-semibold tracking-wide text-white/65">
          Rolling the table...
        </div>
      ) : null}
    </div>
  );
}
