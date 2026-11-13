import { fail, notFound, readJson } from "@/server/http";
import { cleanName, findPlayer, getRoom, joinRoom } from "@/server/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    const { code } = await ctx.params;
    const room = getRoom(code);
    if (!room) return notFound();
    const body = await readJson(request);
    // 새로고침 등으로 다시 들어온 사람은 기존 자리로 돌려보냅니다.
    const existing = findPlayer(room, body.token);
    if (existing) return Response.json({ token: existing.token, game: room.game });
    if (body.name === undefined) {
      return Response.json({ needName: true, game: room.game });
    }
    const player = joinRoom(room, cleanName(body.name));
    return Response.json({ token: player.token, game: room.game });
  } catch (err) {
    return fail(err);
  }
}
