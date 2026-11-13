import { getGame } from "@/lib/games";
import { fail, rateLimit, readJson, sessionCookie } from "@/server/http";
import { GameError, cleanName, createRoom } from "@/server/rooms";

export async function POST(request: Request) {
  try {
    rateLimit(request, "create", 20);
    const body = await readJson(request);
    const game = typeof body.game === "string" ? getGame(body.game) : undefined;
    if (!game) throw new GameError("없는 게임입니다.");
    const { room, player } = createRoom(game.slug, cleanName(body.name));
    return Response.json(
      { code: room.code },
      { headers: { "Set-Cookie": sessionCookie(request, room.code, player.token) } },
    );
  } catch (err) {
    return fail(err);
  }
}
