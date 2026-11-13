import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSlug } from "@/lib/games";
import { toKeys } from "@/lib/hangul";
import type { GameAction, LobbyView, RoomView } from "@/lib/types";
import { subscribeLobby } from "../lobby";
import { clearRecords, submitRecord, topRecords } from "../records";
import { GameError, createRoom, dispatch, joinRoom, subscribe, viewFor, type Player } from "../rooms";
import type { User } from "../session";
import { judge } from "./baseball";
import { mark } from "./word";

type ViewOf<G extends GameSlug> = Extract<RoomView, { game: G }>["state"];

let seq = 0;
function user(name: string): User {
  seq += 1;
  return { id: `m${seq}`, sid: `ms${seq}`, name, connections: 1, lastSeen: 0 };
}

function setup<G extends GameSlug>(game: G, names: string[]) {
  const users = names.map(user);
  const room = createRoom(game, users[0]);
  const players = users.map((u) => joinRoom(room, u));
  for (const p of players) subscribe(room, p, { push: () => {}, send: () => {}, end: () => {} });
  const act = (p: Player, action: GameAction) => dispatch(room, p, action);
  const view = (p: Player) => viewFor(room, p.id).state as ViewOf<G>;
  return { room, users, players, host: players[0], act, view };
}

beforeEach(() => {
  vi.useFakeTimers();
  clearRecords();
});
afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("keyboard decomposition", () => {
  it("splits words into single keys", () => {
    expect(toKeys("감자").join("")).toBe("ㄱㅏㅁㅈㅏ");
    expect(toKeys("계란").join("")).toBe("ㄱㅕㅣㄹㅏㄴ");
    expect(toKeys("얘기").join("")).toBe("ㅇㅑㅣㄱㅣ");
    expect(toKeys("꽃").join("")).toBe("ㄱㄱㅗㅊ");
    expect(toKeys("과일").join("")).toBe("ㄱㅗㅏㅇㅣㄹ");
    expect(toKeys("abc")).toEqual([]);
  });
});

describe("baseball", () => {
  it("counts strikes and balls", () => {
    expect(judge("123", "123")).toEqual({ strike: 3, ball: 0 });
    expect(judge("123", "132")).toEqual({ strike: 1, ball: 2 });
    expect(judge("123", "456")).toEqual({ strike: 0, ball: 0 });
    expect(judge("1234", "4321")).toEqual({ strike: 0, ball: 4 });
  });

  function playing() {
    const ctx = setup("baseball", ["가", "나"]);
    ctx.act(ctx.host, { type: "start", digits: 3 });
    const [a, b] = ctx.players;
    ctx.act(a, { type: "secret", value: "123" });
    ctx.act(b, { type: "secret", value: "456" });
    const turn = () => ctx.players.find((p) => p.id === ctx.view(a).turnId)!;
    const waiting = () => ctx.players.find((p) => p.id !== ctx.view(a).turnId)!;
    const answerFor = (p: Player) => (p === a ? "456" : "123");
    return { ...ctx, a, b, turn, waiting, answerFor };
  }

  it("needs exactly two players and valid secrets", () => {
    const solo = setup("baseball", ["가"]);
    expect(() => solo.act(solo.host, { type: "start" })).toThrow(GameError);
    const { host, players, act, view } = setup("baseball", ["가", "나"]);
    act(host, { type: "start", digits: 3 });
    expect(() => act(host, { type: "secret", value: "112" })).toThrow(GameError);
    expect(() => act(host, { type: "secret", value: "12" })).toThrow(GameError);
    act(host, { type: "secret", value: "012" });
    // 내 숫자는 상대에게 가지 않습니다.
    expect(view(host).yourSecret).toBe("012");
    expect(view(players[1]).yourSecret).toBeNull();
    expect(view(players[1]).secrets).toBeNull();
  });

  it("assigns a random secret when someone runs out of time", () => {
    const { host, players, act, view } = setup("baseball", ["가", "나"]);
    act(host, { type: "start", digits: 4 });
    vi.advanceTimersByTime(60_000);
    expect(view(host).phase).toBe("play");
    expect(view(players[1]).yourSecret).toMatch(/^\d{4}$/);
  });

  it("alternates turns and rejects out-of-turn guesses", () => {
    const { act, view, turn, waiting, a } = playing();
    const first = turn();
    expect(() => act(waiting(), { type: "guess", value: "789" })).toThrow(GameError);
    act(first, { type: "guess", value: "789" });
    expect(view(a).guesses).toHaveLength(1);
    expect(turn()).not.toBe(first);
  });

  it("gives the second player a last chance when the starter solves it first", () => {
    const { act, view, turn, answerFor, a } = playing();
    const starter = turn();
    act(starter, { type: "guess", value: answerFor(starter) });
    expect(view(a)).toMatchObject({ phase: "play", lastChance: true });
    const second = turn();
    act(second, { type: "guess", value: "789" });
    expect(view(a)).toMatchObject({ phase: "result", winnerId: starter.id });
    expect(view(a).secrets).toBeTruthy();
  });

  it("is a draw when both solve it in the same number of turns", () => {
    const { act, view, turn, answerFor, a } = playing();
    const starter = turn();
    act(starter, { type: "guess", value: answerFor(starter) });
    const second = turn();
    act(second, { type: "guess", value: answerFor(second) });
    expect(view(a)).toMatchObject({ phase: "result", winnerId: null });
  });

  it("lets the second player win outright", () => {
    const { act, view, turn, answerFor, a } = playing();
    act(turn(), { type: "guess", value: "789" });
    const second = turn();
    act(second, { type: "guess", value: answerFor(second) });
    expect(view(a)).toMatchObject({ phase: "result", winnerId: second.id });
  });
});

describe("word", () => {
  it("marks repeated keys the way a careful player would expect", () => {
    const k = (s: string) => Array.from(s);
    expect(mark(k("ㄱㅏㅁㅈㅏ"), k("ㄱㅏㅁㅈㅏ"))).toEqual(["hit", "hit", "hit", "hit", "hit"]);
    // 정답에 ㅏ가 둘: 추측의 ㅏ 셋 중 자리가 맞는 것 먼저, 남는 하나만 near
    expect(mark(k("ㄱㅏㅁㅈㅏ"), k("ㅏㅏㅏㅂㅂ"))).toEqual(["near", "hit", "miss", "miss", "miss"]);
    expect(mark(k("ㄱㅏㅁㅈㅏ"), k("ㅁㄱㅂㅂㅂ"))).toEqual(["near", "near", "miss", "miss", "miss"]);
  });

  it("shows other players only the colors and reveals the answer when you are done", () => {
    const { host, players, act, view } = setup("word", ["가", "나"]);
    act(host, { type: "start", length: 5 });
    expect(view(host).answer).toBeNull();
    expect(() => act(host, { type: "guess", keys: ["ㄱ", "ㅏ"] })).toThrow(GameError);
    expect(() => act(host, { type: "guess", keys: ["ㄲ", "ㅏ", "ㅁ", "ㅈ", "ㅏ"] })).toThrow(GameError);

    const guess = Array.from("ㅂㅂㅂㅂㅂ");
    act(host, { type: "guess", keys: guess });
    expect(view(host).boards[host.id].rows[0].keys).toEqual(guess);
    expect(view(players[1]).boards[host.id].rows[0].keys).toBeNull();
    expect(view(players[1]).boards[host.id].rows[0].marks).toHaveLength(5);

    for (let i = 0; i < 5; i++) act(host, { type: "guess", keys: guess });
    expect(view(host).boards[host.id].done).toBe(true);
    const answer = view(host).answer!;
    expect(toKeys(answer)).toHaveLength(5);
    expect(view(players[1]).answer).toBeNull();

    vi.advanceTimersByTime(10_000);
    act(players[1], { type: "guess", keys: toKeys(answer) });
    expect(view(host).phase).toBe("result");
    expect(view(host).boards[players[1].id].solvedMs).toBe(10_000);
  });
});

describe("snake", () => {
  type Internal = {
    snakes: { id: string; body: [number, number][]; dir: string; alive: boolean; score: number; queue: string[] }[];
    foods: [number, number][];
    tickMs: number;
  };

  it("moves each tick, turns on input, and ignores reversing", () => {
    const { room, host, act, view } = setup("snake", ["가", "나"]);
    act(host, { type: "start", speed: "normal" });
    const s = room.state as Internal;
    s.foods = [];
    const me = s.snakes[0];
    const head = () => [...me.body[0]];
    const start = head();
    vi.advanceTimersByTime(3_000);
    expect(head()).toEqual([start[0] + 1, start[1]]);
    act(host, { type: "turn", dir: "L" }); // 반대 방향은 무시
    act(host, { type: "turn", dir: "D" });
    vi.advanceTimersByTime(130);
    expect(head()).toEqual([start[0] + 1, start[1] + 1]);
    expect(view(host).snakes[0].body.slice(0, 2)).toEqual(head());
  });

  it("grows on food and ends when one snake is left", () => {
    const { room, host, players, act, view } = setup("snake", ["가", "나"]);
    act(host, { type: "start", speed: "normal" });
    const s = room.state as Internal;
    const me = s.snakes[0];
    s.foods = [[me.body[0][0] + 1, me.body[0][1]]];
    vi.advanceTimersByTime(3_000);
    expect(me.score).toBe(1);
    expect(me.body).toHaveLength(5);
    // 상대를 벽 바로 앞에 둡니다.
    const rival = s.snakes[1];
    rival.body = [[0, 10], [1, 10], [2, 10], [3, 10]];
    rival.dir = "L";
    vi.advanceTimersByTime(130);
    expect(rival.alive).toBe(false);
    expect(view(host)).toMatchObject({ phase: "result", winnerId: host.id });
    expect(view(players[1]).snakes[1].alive).toBe(false);
  });

  it("kills both snakes in a head-on collision", () => {
    const { room, host, act, view } = setup("snake", ["가", "나"]);
    act(host, { type: "start" });
    const s = room.state as Internal;
    s.foods = [];
    s.snakes[0].body = [[10, 5], [9, 5], [8, 5], [7, 5]];
    s.snakes[0].dir = "R";
    s.snakes[1].body = [[12, 5], [13, 5], [14, 5], [15, 5]];
    s.snakes[1].dir = "L";
    vi.advanceTimersByTime(3_000);
    expect(s.snakes.map((x) => x.alive)).toEqual([false, false]);
    expect(view(host)).toMatchObject({ phase: "result", winnerId: null });
  });
});

describe("records", () => {
  it("keeps one best entry per name, ordered by the board's direction", () => {
    expect(submitRecord("reaction", "가", 300)).toEqual({ rank: 1, best: true });
    expect(submitRecord("reaction", "나", 250)).toEqual({ rank: 1, best: true });
    expect(submitRecord("reaction", "가", 400)).toEqual({ rank: 2, best: false });
    expect(submitRecord("reaction", "가", 200)).toEqual({ rank: 1, best: true });
    expect(topRecords("reaction").map((r) => [r.name, r.value])).toEqual([["가", 200], ["나", 250]]);

    submitRecord("stairs", "가", 10);
    submitRecord("stairs", "나", 30);
    expect(topRecords("stairs").map((r) => r.name)).toEqual(["나", "가"]);
    expect(submitRecord("nope", "가", 1)).toEqual({ rank: 0, best: false });
  });
});

describe("memory", () => {
  it("hides face-down cards, matches pairs, and records the time", () => {
    const { room, host, act, view } = setup("memory", ["기억가"]);
    act(host, { type: "start", level: "easy" });
    expect(view(host).faces.every((f) => f === null)).toBe(true);
    expect(view(host).faces).toHaveLength(16);

    const cards = (room.state as { cards: number[] }).cards;
    const pairOf = (i: number) => cards.findIndex((c, j) => j !== i && c === cards[i]);
    const wrong = cards.findIndex((c) => c !== cards[0]);
    act(host, { type: "flip", index: 0 });
    act(host, { type: "flip", index: wrong });
    expect(view(host).faces.filter((f) => f !== null)).toHaveLength(2);
    vi.advanceTimersByTime(800);
    expect(view(host).faces.every((f) => f === null)).toBe(true);
    expect(view(host).moves).toBe(1);

    vi.advanceTimersByTime(4_200);
    const done = new Set<number>();
    for (let i = 0; i < cards.length; i++) {
      if (done.has(i)) continue;
      act(host, { type: "flip", index: i });
      act(host, { type: "flip", index: pairOf(i) });
      done.add(i).add(pairOf(i));
    }
    const v = view(host);
    expect(v).toMatchObject({ phase: "result", finishedMs: 5_000, moves: 9 });
    expect(v.last).toMatchObject({ board: "memory-easy", value: 5_000, rank: 1, best: true });
    expect(v.boards.find((b) => b.key === "memory-easy")!.rows[0]).toMatchObject({ name: "기억가", value: 5_000 });
  });
});

describe("reaction", () => {
  it("restarts the round on a false start and records the average", () => {
    const { host, act, view } = setup("reaction", ["반응가"]);
    act(host, { type: "start" });
    act(host, { type: "tap" });
    expect(view(host)).toMatchObject({ phase: "early", round: 1 });
    vi.advanceTimersByTime(1_400);
    expect(view(host).phase).toBe("wait");

    for (let round = 1; round <= 5; round++) {
      vi.advanceTimersByTime(4_500);
      expect(view(host)).toMatchObject({ phase: "go", round });
      vi.advanceTimersByTime(200 + round * 10);
      // 서버가 신호를 보낸 뒤 흐른 시간보다 짧게 주장할 수는 있지만, 사람이 낼 수 없는 값은 안 됩니다.
      act(host, { type: "tap", ms: 190 + round * 10 });
      vi.advanceTimersByTime(1_200);
    }
    const v = view(host);
    expect(v).toMatchObject({ phase: "result", times: [200, 210, 220, 230, 240], average: 220 });
    expect(v.last).toMatchObject({ board: "reaction", value: 220, rank: 1 });
  });

  it("treats impossible times as a false start and never trusts more than the real elapsed time", () => {
    const { host, act, view } = setup("reaction", ["반응나"]);
    act(host, { type: "start" });
    vi.advanceTimersByTime(4_500);
    act(host, { type: "tap", ms: 5 });
    expect(view(host).phase).toBe("early");
    vi.advanceTimersByTime(1_400 + 4_500);
    // 신호는 1.5~4.5초 사이 어느 시점에 나갔으므로, 실제로 흐른 시간은 3초를 넘지 않습니다.
    act(host, { type: "tap", ms: 100_000 });
    expect(view(host).times).toHaveLength(1);
    expect(view(host).times[0]).toBeLessThanOrEqual(3_000);
  });
});

describe("aim and stairs", () => {
  it("caps aim scores at what is physically possible and records at the end", () => {
    const { host, act, view } = setup("aim", ["에임가"]);
    act(host, { type: "start" });
    expect(view(host).targets).toHaveLength(480);
    vi.advanceTimersByTime(3_000 + 1_100);
    act(host, { type: "progress", hits: 9_999, misses: 2 });
    expect(view(host).hits).toBe(10);
    vi.advanceTimersByTime(28_900);
    act(host, { type: "progress", hits: 40, misses: 10, final: true });
    const v = view(host);
    expect(v).toMatchObject({ phase: "result", hits: 40, misses: 10 });
    expect(v.last).toMatchObject({ board: "aim", value: 40.08, rank: 1 });
  });

  it("records the stairs climbed when the player falls", () => {
    const { host, act, view } = setup("stairs", ["계단가"]);
    act(host, { type: "start" });
    expect(view(host).steps).toMatch(/^[LR]{2000}$/);
    vi.advanceTimersByTime(3_000 + 6_000);
    act(host, { type: "out", climbed: 500 });
    const v = view(host);
    expect(v.phase).toBe("result");
    expect(v.climbed).toBe(100);
    expect(v.last).toMatchObject({ board: "stairs", value: 100 });
  });
});

describe("solo rooms in the lobby", () => {
  it("are not listed as open rooms and cannot be joined by others", () => {
    const u = user("혼자가");
    const room = createRoom("reaction", u);
    const p = joinRoom(room, u);
    subscribe(room, p, { push: () => {}, send: () => {}, end: () => {} });
    const seen: LobbyView[] = [];
    const off = subscribeLobby(undefined, (payload) => seen.push(JSON.parse(payload)));
    vi.advanceTimersByTime(50);
    const last = seen.at(-1)!;
    expect(last.rooms.find((r) => r.code === room.code)).toBeUndefined();
    expect(() => joinRoom(room, user("끼어들기"))).toThrow(GameError);
    off();
  });
});
