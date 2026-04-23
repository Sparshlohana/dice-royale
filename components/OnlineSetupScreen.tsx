"use client";

import { useMemo, useState } from "react";
import { OnlineIdentity } from "@/lib/types";

interface OnlineSetupScreenProps {
  initialRoomId: string | null;
  initialIdentity: OnlineIdentity | null;
  onReady: (roomId: string, identity: OnlineIdentity) => void;
  onBack: () => void;
}

function parseRoomId(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("room");
  } catch {
    return trimmed;
  }
}

function generateClientId() {
  if (
    typeof globalThis !== "undefined" &&
    "crypto" in globalThis &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildIdentity(
  name: string,
  existingIdentity: OnlineIdentity | null,
): OnlineIdentity {
  return {
    userId: existingIdentity?.userId ?? generateClientId(),
    name: name.trim(),
  };
}

export function OnlineSetupScreen({
  initialRoomId,
  initialIdentity,
  onReady,
  onBack,
}: OnlineSetupScreenProps) {
  const [name, setName] = useState(initialIdentity?.name ?? "");
  const [password, setPassword] = useState("");
  const [joinInput, setJoinInput] = useState(initialRoomId ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [activeInvite, setActiveInvite] = useState<string | null>(null);

  const normalizedRoomId = useMemo(() => parseRoomId(joinInput), [joinInput]);

  const joinRoom = async (roomId: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter your player name first.");
      return;
    }

    setBusy("join");
    setError("");

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as {
        metadata?: { active?: "true" | "false"; status?: string };
        error?: string;
      };

      if (
        !response.ok ||
        data.metadata?.active !== "true" ||
        data.metadata.status === "closed"
      ) {
        throw new Error(data.error ?? "This room is not active anymore.");
      }

      onReady(roomId, buildIdentity(trimmedName, initialIdentity));
    } catch (joinError) {
      setError(
        joinError instanceof Error ? joinError.message : "Unable to join room.",
      );
    } finally {
      setBusy(null);
    }
  };

  const createRoom = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Enter your player name first.");
      return;
    }

    setBusy("create");
    setError("");
    setActiveInvite(null);

    try {
      const identity = buildIdentity(trimmedName, initialIdentity);
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          userId: identity.userId,
          name: identity.name,
        }),
      });
      const data = (await response.json()) as {
        roomId?: string;
        inviteLink?: string;
        error?: string;
      };

      if (response.status === 409) {
        setActiveInvite(data.inviteLink ?? null);
        throw new Error(data.error ?? "Another active room already exists.");
      }

      if (!response.ok || !data.roomId) {
        throw new Error(data.error ?? "Unable to create room.");
      }

      onReady(data.roomId, identity);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create room.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="screen-shell flex items-center">
      <div className="content-wrap grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel-strong rounded-[2rem] p-8 sm:p-10">
          <button onClick={onBack} className="button-ghost mb-8 px-4 py-2 text-sm">
            Back
          </button>
          <p className="eyebrow mb-4">Online Rooms</p>
          <h1 className="text-5xl font-extrabold text-white sm:text-6xl">
            Create one live table
          </h1>
          <p className="muted mt-5 max-w-xl text-base leading-7">
            Liveblocks powers a single active room at a time. Create it with the
            room password, send the invite link, and everyone can play from
            their own device.
          </p>
        </section>

        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                Your player name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your display name"
                className="field-input"
                maxLength={24}
              />
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-lg font-extrabold text-white">Create room</p>
              <p className="muted mt-2 text-sm">
                Only one room can be active. The room password is required to
                create it.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                  Room password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter room password"
                  className="field-input"
                />
              </div>

              <button
                onClick={createRoom}
                disabled={busy !== null}
                className="button-primary mt-5 w-full px-5 py-4 text-lg"
              >
                {busy === "create" ? "Creating..." : "Create live room"}
              </button>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
              <p className="text-lg font-extrabold text-white">Join room</p>
              <p className="muted mt-2 text-sm">
                Paste the invite link or room ID, or use the detected invite
                from the current URL.
              </p>

              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                  Invite link or room ID
                </label>
                <input
                  value={joinInput}
                  onChange={(event) => setJoinInput(event.target.value)}
                  placeholder="https://.../?room=... or dice-..."
                  className="field-input"
                />
              </div>

              <button
                onClick={() => normalizedRoomId && joinRoom(normalizedRoomId)}
                disabled={busy !== null || !normalizedRoomId}
                className="button-secondary mt-5 w-full px-5 py-4 text-lg"
              >
                {busy === "join" ? "Joining..." : "Join live room"}
              </button>
            </div>

            {error ? (
              <div className="rounded-[1.5rem] border border-rose-400/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-rose-200">{error}</p>
              </div>
            ) : null}

            {activeInvite ? (
              <div className="rounded-[1.5rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-4">
                <p className="text-sm font-semibold text-cyan-100">
                  An active room already exists.
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    readOnly
                    value={activeInvite}
                    className="field-input flex-1"
                  />
                  <button
                    onClick={() => {
                      const roomId = parseRoomId(activeInvite);
                      if (roomId) {
                        joinRoom(roomId);
                      }
                    }}
                    className="button-primary px-5 py-3"
                  >
                    Join active room
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
