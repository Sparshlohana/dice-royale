import { Liveblocks } from "@liveblocks/node";

function getSecretKey() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not configured.");
  }

  return secret;
}

export function getLiveblocksServer() {
  return new Liveblocks({
    secret: getSecretKey(),
  });
}

export function buildInviteLink(origin: string, roomId: string) {
  return `${origin}/?room=${roomId}`;
}
