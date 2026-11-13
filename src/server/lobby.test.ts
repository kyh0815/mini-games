import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LobbyView } from "@/lib/types";
import { setNotice, subscribeLobby } from "./lobby";
import { GameError, PasswordError, cleanPassword, createRoom, dispatch, joinRoom, subscribe } from "./rooms";
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
      locked: false,
    });
    expect(last().users.find((u) => u.id === b.user.id)?.room).toEqual({
      code: room.code,
      game: "draw",
      joinable: true,
    });

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

describe("password rooms", () => {
  it("lets people in only with the right password and marks the room as locked", () => {
    const host = signUp("잠금가");
    const guest = signUp("잠금나");
    const room = createRoom("draw", host.user, "1234");
    const hostPlayer = joinRoom(room, host.user);
    subscribe(room, hostPlayer, { push: () => {}, send: () => {}, end: () => {} });

    expect(() => joinRoom(room, guest.user)).toThrow(PasswordError);
    expect(() => joinRoom(room, guest.user, "0000")).toThrow(PasswordError);
    expect(room.players).toHaveLength(1);

    const player = joinRoom(room, guest.user, "1234");
    // 이미 들어온 사람은 새로고침해도 비밀번호를 다시 묻지 않습니다.
    expect(joinRoom(room, guest.user)).toBe(player);

    const seen: LobbyView[] = [];
    const off = subscribeLobby(undefined, (payload) => seen.push(JSON.parse(payload)));
    expect(seen.at(-1)!.rooms.find((r) => r.code === room.code)?.locked).toBe(true);
    // 비밀번호는 어디에도 내려가지 않습니다.
    expect(JSON.stringify(seen.at(-1))).not.toContain("1234");
    off();
  });

  it("does not lock solo games and rejects overlong passwords", () => {
    const u = signUp("잠금다");
    expect(createRoom("reaction", u.user, "1234").lock).toBeNull();
    expect(createRoom("draw", u.user).lock).toBeNull();
    expect(cleanPassword("")).toBeNull();
    expect(cleanPassword("1234")).toBe("1234");
    expect(() => cleanPassword("x".repeat(21))).toThrow(GameError);
  });
});

describe("notice", () => {
  it("reaches everyone connected, including people who arrive later, until it is cleared", () => {
    const seen: LobbyView[] = [];
    const off = subscribeLobby(undefined, (payload) => seen.push(JSON.parse(payload)));
    expect(seen.at(-1)!.notice).toBeNull();

    setNotice("  곧 서버\n점검 예정입니다.  ");
    vi.advanceTimersByTime(50);
    expect(seen.at(-1)!.notice?.text).toBe("곧 서버 점검 예정입니다.");

    const late: LobbyView[] = [];
    const offLate = subscribeLobby(undefined, (payload) => late.push(JSON.parse(payload)));
    expect(late[0].notice?.text).toBe("곧 서버 점검 예정입니다.");

    expect(() => setNotice("가".repeat(81))).toThrow(GameError);
    setNotice("");
    vi.advanceTimersByTime(50);
    expect(seen.at(-1)!.notice).toBeNull();
    off();
    offLate();
  });
});
