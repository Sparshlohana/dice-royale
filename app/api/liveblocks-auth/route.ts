import { getLiveblocksServer } from "@/lib/liveblocks-server";
import { RoomMetadata } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { room, userId, name } = (await request.json()) as {
      room?: string;
      userId?: string;
      name?: string;
    };

    if (!room || !userId || !name) {
      return Response.json(
        { error: "room, userId, and name are required." },
        { status: 400 },
      );
    }

    const liveblocks = getLiveblocksServer();
    const targetRoom = await liveblocks.getRoom(room);
    const metadata = targetRoom.metadata as Partial<RoomMetadata> | undefined;

    if (metadata?.active !== "true" || metadata.status === "closed") {
      return Response.json(
        { error: "This room is no longer active." },
        { status: 403 },
      );
    }

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name,
        isHost: metadata.hostUserId === userId,
      },
    });

    session.allow(room, session.FULL_ACCESS);

    const { body, status } = await session.authorize();

    return new Response(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to authorize room access.";

    return Response.json({ error: message }, { status: 500 });
  }
}
