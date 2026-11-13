import { createHash, timingSafeEqual } from "node:crypto";
import { fail, rateLimit, readJson } from "@/server/http";
import { setNotice } from "@/server/lobby";

const digest = (value: string) => createHash("sha256").update(value).digest();

/** ADMIN_TOKEN을 정해 두지 않은 서버에서는 이 주소가 없는 것처럼 답합니다. */
function allowed(request: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const given = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return timingSafeEqual(digest(given), digest(token));
}

const missing = () => new Response(null, { status: 404 });

/** 공지를 띄웁니다. 본문: { "text": "..." } */
export async function POST(request: Request) {
  try {
    rateLimit(request, "admin", 20);
    if (!allowed(request)) return missing();
    const body = await readJson(request);
    return Response.json({ notice: setNotice(body.text) });
  } catch (err) {
    return fail(err);
  }
}

/** 공지를 내립니다. */
export async function DELETE(request: Request) {
  try {
    rateLimit(request, "admin", 20);
    if (!allowed(request)) return missing();
    return Response.json({ notice: setNotice(null) });
  } catch (err) {
    return fail(err);
  }
}
