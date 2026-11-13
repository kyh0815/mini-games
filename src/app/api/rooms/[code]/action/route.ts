import { fail, notFound, readJson } from "@/server/http";
import { GameError, dispatch, findPlayer, getRoom } from "@/server/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/action">) {
  try {
    const { code } = await ctx.params;
    const room = getRoom(code);
    if (!room) return notFound();
    const body = await readJson(request);
    const player = findPlayer(room, body.token);
    if (!player) throw new GameError("이 방의 참가자가 아닙니다.");
    dispatch(room, player, body.action);
    return Response.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
