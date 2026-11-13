import { fail, notFound, rateLimit, readJson, readSession, sessionCookie } from "@/server/http";
import { cleanName, findPlayer, getRoom, joinRoom } from "@/server/rooms";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    rateLimit(request, "join", 120);
    const { code } = await ctx.params;
    const room = getRoom(code);
    if (!room) return notFound();
    const body = await readJson(request);
    // 새로고침 등으로 다시 들어온 사람은 기존 자리로 돌려보냅니다.
    if (findPlayer(room, readSession(request, room.code))) {
      return Response.json({ joined: true });
    }
    if (body.name === undefined) return Response.json({ joined: false });
    const player = joinRoom(room, cleanName(body.name));
    return Response.json(
      { joined: true },
      { headers: { "Set-Cookie": sessionCookie(request, room.code, player.token) } },
    );
  } catch (err) {
    return fail(err);
  }
}
