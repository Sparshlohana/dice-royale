import { getLiveblocksServer } from "@/lib/liveblocks-server";
import { RoomMetadata } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/rooms/[roomId]">,
) {
  try {
    const { roomId } = await context.params;
    const liveblocks = getLiveblocksServer();
    const room = await liveblocks.getRoom(roomId);
    const metadata = room.metadata as Partial<RoomMetadata> | undefined;

    return Response.json({
      roomId: room.id,
      metadata,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load room.";

    return Response.json({ error: message }, { status: 404 });
  }
}
