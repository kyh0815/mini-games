import { fail, notFound, rateLimit, readJson } from "@/server/http";
import { PasswordError, cleanPassword, getRoom, joinRoom } from "@/server/rooms";
import { requireUser } from "@/server/session";

export async function POST(request: Request, ctx: RouteContext<"/api/rooms/[code]/join">) {
  try {
    rateLimit(request, "join", 120);
    const { code } = await ctx.params;
    const room = getRoom(code);
    if (!room) return notFound();
    const user = requireUser(request);
    const body = await readJson(request);
    try {
      joinRoom(room, user, cleanPassword(body.password));
    } catch (err) {
      if (!(err instanceof PasswordError)) throw err;
      // 비밀번호를 마구 넣어 보는 것을 막습니다.
      if (body.password) rateLimit(request, `password:${room.code}`, 8);
      return Response.json({ error: err.message, needPassword: true }, { status: 401 });
    }
    return Response.json({ ok: true, game: room.game });
  } catch (err) {
    return fail(err);
  }
}
