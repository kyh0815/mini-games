import { getGame } from "@/lib/games";
import { fail, readJson } from "@/server/http";
import { GameError, cleanName, createRoom } from "@/server/rooms";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const game = typeof body.game === "string" ? getGame(body.game) : undefined;
    if (!game) throw new GameError("없는 게임입니다.");
    const { room, player } = createRoom(game.slug, cleanName(body.name));
    return Response.json({ code: room.code, token: player.token });
  } catch (err) {
    return fail(err);
  }
}
