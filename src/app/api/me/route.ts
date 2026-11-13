import { fail, rateLimit, readJson } from "@/server/http";
import { renameEverywhere } from "@/server/rooms";
import { renameOwner } from "@/server/records";
import { ownerOf, saveUser, sessionCookie } from "@/server/session";

/** 닉네임을 정하거나 바꿉니다. */
export async function POST(request: Request) {
  try {
    rateLimit(request, "me", 30);
    const body = await readJson(request);
    const { user, created } = saveUser(request, body.name);
    renameEverywhere(user);
    renameOwner({ owner: ownerOf(user), name: user.name });
    return Response.json(
      { id: user.id, name: user.name },
      created ? { headers: { "Set-Cookie": sessionCookie(request, user) } } : undefined,
    );
  } catch (err) {
    return fail(err);
  }
}
