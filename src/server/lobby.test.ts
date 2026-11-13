import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LobbyView } from "@/lib/types";
import { subscribeLobby } from "./lobby";
import { createRoom, dispatch, joinRoom, subscribe } from "./rooms";
import { saveUser, sessionCookie } from "./session";

function request(cookie?: string): Request {
  return new Request("http://localhost/api", { headers: cookie ? { cookie } : {} });
}

/** 닉네임을 정하고, 그 세션 쿠키를 가진 요청을 만들어 줍니다. */
function signUp(name: string) {
  const { user } = saveUser(request(), name);
  const cookie = sessionCookie(request(), user).split(";")[0];
  return { user, cookie };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  // 걸려 있던 타이머(로비 알림 묶음 등)를 비우고 끝냅니다.
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("session", () => {
  it("keeps the same user when the nickname changes", () => {
    const { user, cookie } = signUp("세션가");
    const again = saveUser(request(cookie), "세션나");
    expect(again.created).toBe(false);
    expect(again.user.id).toBe(user.id);
    expect(user.name).toBe("세션나");
  });

  it("rejects a nickname another online user is using", () => {
    const { user } = signUp("겹침");
    const off = subscribeLobby(user, () => {});
    expect(() => saveUser(request(), "겹침")).toThrow();
    off();
    expect(() => saveUser(request(), "겹침")).not.toThrow();
  });

  it("issues an HttpOnly cookie", () => {
    const { user } = signUp("쿠키");
    const cookie = sessionCookie(request(), user);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });
});

describe("lobby", () => {
  it("streams online users and open rooms as they change", () => {
    const a = signUp("로비가");
    const b = signUp("로비나");
    const seen: LobbyView[] = [];
    const offA = subscribeLobby(a.user, (payload) => seen.push(JSON.parse(payload)));
    const offB = subscribeLobby(b.user, () => {});
    vi.advanceTimersByTime(50);
    const last = () => seen.at(-1)!;

    expect(last().you).toEqual({ id: a.user.id, name: "로비가" });
    expect(last().users.map((u) => u.name)).toEqual(expect.arrayContaining(["로비가", "로비나"]));

    // 방은 누군가 실제로 접속해 있을 때만 목록에 나옵니다.
    const room = createRoom("draw", b.user);
    vi.advanceTimersByTime(50);
    expect(last().rooms.find((r) => r.code === room.code)).toBeUndefined();

    const player = joinRoom(room, b.user);
    const leave = subscribe(room, player, { push: () => {}, send: () => {}, end: () => {} });
    vi.advanceTimersByTime(50);
    expect(last().rooms.find((r) => r.code === room.code)).toMatchObject({
      game: "draw",
      host: "로비나",
      players: 1,
      playing: false,
    });
    expect(last().users.find((u) => u.id === b.user.id)?.room).toEqual({ code: room.code, game: "draw" });

    dispatch(room, player, { type: "leave" });
    leave();
    vi.advanceTimersByTime(50);
    expect(last().rooms.find((r) => r.code === room.code)).toBeUndefined();

    offB();
    vi.advanceTimersByTime(50);
    expect(last().users.map((u) => u.name)).not.toContain("로비나");
    offA();
  });
});
