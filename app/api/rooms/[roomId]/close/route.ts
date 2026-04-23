import { getLiveblocksServer } from "@/lib/liveblocks-server";
import { RoomMetadata } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/rooms/[roomId]/close">,
) {
  try {
    const { roomId } = await context.params;
    const { userId } = (await request.json()) as { userId?: string };

    if (!userId) {
      return Response.json({ error: "userId is required." }, { status: 400 });
    }

    const liveblocks = getLiveblocksServer();
    const room = await liveblocks.getRoom(roomId);
    const metadata = room.metadata as Partial<RoomMetadata> | undefined;

    if (metadata?.hostUserId !== userId) {
      return Response.json(
        { error: "Only the room host can close this room." },
        { status: 403 },
      );
    }

    await liveblocks.updateRoom(roomId, {
      metadata: {
        active: "false",
        status: "closed",
      } as unknown as Record<string, string>,
    });

    return Response.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to close room.";

    return Response.json({ error: message }, { status: 500 });
  }
}
