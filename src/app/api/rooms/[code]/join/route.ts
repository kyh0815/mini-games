import { fail, notFound, rateLimit } from "@/server/http";
import { getRoom, joinRoom } from "@/server/rooms";
import { requireUser } from "@/server/session";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    rateLimit(request, "join", 120);
    const { code } = await ctx.params;
    const room = getRoom(code);
    if (!room) return notFound();
    joinRoom(room, requireUser(request));
    return Response.json({ ok: true, game: room.game });
  } catch (err) {
    return fail(err);
  }
}
