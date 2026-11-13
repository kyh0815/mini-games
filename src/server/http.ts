import { GameError } from "./rooms";

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // 아래에서 한 번에 처리
  }
  throw new GameError("잘못된 요청입니다.");
}

export function fail(err: unknown): Response {
  if (err instanceof GameError) {
    return Response.json({ error: err.message }, { status: 400 });
  }
  console.error(err);
  return Response.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
}

export function notFound(): Response {
  return Response.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
}
