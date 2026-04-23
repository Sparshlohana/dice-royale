import { buildInviteLink, getLiveblocksServer } from "@/lib/liveblocks-server";
import { randomUUID } from "node:crypto";
import { RoomMetadata } from "@/lib/types";

export const dynamic = "force-dynamic";

function findActiveRooms(
  rooms: Array<{ id: string; metadata?: unknown }>,
): Array<{ id: string; metadata?: RoomMetadata }> {
  const activeRooms: Array<{ id: string; metadata?: RoomMetadata }> = [];

  for (const room of rooms) {
    const metadata = room.metadata as Partial<RoomMetadata> | undefined;
    if (metadata?.active === "true") {
      activeRooms.push({
        id: room.id,
        metadata: metadata as RoomMetadata,
      });
    }
  }

  return activeRooms;
}

export async function POST(request: Request) {
  try {
    const { password, userId, name } = (await request.json()) as {
      password?: string;
      userId?: string;
      name?: string;
    };

    if (password !== "password") {
      return Response.json({ error: "Invalid room password." }, { status: 403 });
    }

    if (!userId || !name) {
      return Response.json(
        { error: "userId and name are required." },
        { status: 400 },
      );
    }

    const liveblocks = getLiveblocksServer();
    const { data: rooms } = await liveblocks.getRooms();
    const activeRooms = findActiveRooms(rooms);

    for (const activeRoom of activeRooms) {
      await liveblocks.deleteRoom(activeRoom.id);
    }

    const roomId = `dice-${randomUUID()}`;
    const metadata: RoomMetadata = {
      active: "true",
      hostUserId: userId,
      hostName: name,
      status: "lobby",
      createdAt: String(Date.now()),
    };

    await liveblocks.createRoom(roomId, {
      defaultAccesses: [],
      metadata: metadata as unknown as Record<string, string>,
    });

    return Response.json({
      roomId,
      inviteLink: buildInviteLink(new URL(request.url).origin, roomId),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create room.";

    return Response.json({ error: message }, { status: 500 });
  }
}
