import { fail, notFound, readJson } from "@/server/http";
import { GameError, dispatch, findPlayer, getRoom } from "@/server/rooms";
import { getUser } from "@/server/session";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/action">) {
  try {
    const { code } = await ctx.params;
    const room = getRoom(code);
    if (!room) return notFound();
    const player = findPlayer(room, getUser(request));
    if (!player) throw new GameError("이 방의 참가자가 아닙니다.");
    dispatch(room, player, (await readJson(request)).action);
    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
