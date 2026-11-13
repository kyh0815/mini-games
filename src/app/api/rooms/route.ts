import { getGame } from "@/lib/games";
import { fail, rateLimit, readJson } from "@/server/http";
import { GameError, cleanPassword, createRoom } from "@/server/rooms";
import { requireUser } from "@/server/session";

export async function POST(request: Request) {
  try {
    rateLimit(request, "create", 20);
    const user = requireUser(request);
    const body = await readJson(request);
    const game = typeof body.game === "string" ? getGame(body.game) : undefined;
    if (!game) throw new GameError("없는 게임입니다.");
    return Response.json({ code: createRoom(game.slug, user, cleanPassword(body.password)).code });
  } catch (err) {
    return fail(err);
  }
}
