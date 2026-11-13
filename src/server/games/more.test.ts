import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSlug } from "@/lib/games";
import { toKeys } from "@/lib/hangul";
import type { GameAction, LobbyView, RoomView } from "@/lib/types";
import { subscribeLobby } from "../lobby";
import { allBoards, clearRecords, renameOwner, submitRecord, topRecords } from "../records";
import { GameError, createRoom, dispatch, joinRoom, subscribe, viewFor, type Player } from "../rooms";
import { ownerOf, saveUser, sessionCookie, type User } from "../session";
import { drainPerMs, paceOf, stageOf } from "@/lib/stairs";
import { judge } from "./baseball";
import { makeSteps } from "./stairs";
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
  const a = { owner: "device-a", name: "가" };
  const b = { owner: "device-b", name: "나" };

  it("keeps one best entry per device, ordered by the board's direction", () => {
    expect(submitRecord("reaction", a, 300)).toEqual({ rank: 1, best: true });
    expect(submitRecord("reaction", b, 250)).toEqual({ rank: 1, best: true });
    expect(submitRecord("reaction", a, 400)).toEqual({ rank: 2, best: false });
    expect(submitRecord("reaction", a, 200)).toEqual({ rank: 1, best: true });
    expect(topRecords("reaction").map((r) => [r.name, r.value])).toEqual([["가", 200], ["나", 250]]);

    submitRecord("stairs-2", a, 10);
    submitRecord("stairs-2", b, 30);
    expect(topRecords("stairs-2").map((r) => r.name)).toEqual(["나", "가"]);
    expect(submitRecord("nope", a, 1)).toEqual({ rank: 0, best: false });
  });

  it("does not let someone using the same nickname touch another device's record", () => {
    submitRecord("reaction", a, 200);
    const impostor = { owner: "device-x", name: "가" };
    // 같은 닉네임으로 더 나쁜 기록을 내도, 더 좋은 기록을 내도 원래 기록은 그대로 남습니다.
    expect(submitRecord("reaction", impostor, 900)).toEqual({ rank: 2, best: true });
    expect(submitRecord("reaction", impostor, 150)).toEqual({ rank: 1, best: true });
    expect(topRecords("reaction").map((r) => [r.name, r.value])).toEqual([["가", 150], ["가", 200]]);
    // 누구의 기록인지는 기기로 가립니다.
    expect(topRecords("reaction", 10, "device-a").map((r) => r.mine)).toEqual([false, true]);
    expect(topRecords("reaction", 10, "device-x").map((r) => r.mine)).toEqual([true, false]);
    expect(topRecords("reaction").map((r) => r.mine)).toEqual([false, false]);
  });

  it("renames a device's records when its nickname changes and never exposes the owner value", () => {
    submitRecord("reaction", a, 200);
    submitRecord("sequence", a, 7);
    submitRecord("reaction", b, 300);
    renameOwner({ owner: "device-a", name: "새이름" });
    expect(topRecords("reaction").map((r) => r.name)).toEqual(["새이름", "나"]);
    expect(topRecords("sequence").map((r) => r.name)).toEqual(["새이름"]);
    expect(JSON.stringify(allBoards("device-a"))).not.toContain("device-");
  });
});

describe("device identity", () => {
  const request = (cookie?: string) =>
    new Request("http://localhost/api", { headers: cookie ? { cookie } : {} });

  it("derives the record owner from the cookie, not the nickname", () => {
    const first = saveUser(request(), "기기가").user;
    const second = saveUser(request(), "기기나").user;
    expect(ownerOf(first)).not.toBe(ownerOf(second));
    expect(ownerOf(first)).toBe(ownerOf({ sid: first.sid }));
    expect(ownerOf(first)).not.toContain(first.sid.slice(0, 16));
  });

  it("keeps the same device after the server forgets its sessions", () => {
    // 서버가 모르는 쿠키(다시 켜지기 전에 받은 것)로 닉네임을 정하면 같은 기기로 이어집니다.
    const sid = "ab".repeat(24);
    const again = saveUser(request(`mg_session=${sid}`), "돌아옴");
    expect(again.created).toBe(true);
    expect(again.user.sid).toBe(sid);
    expect(sessionCookie(request(), again.user)).toContain(`Max-Age=${400 * 24 * 60 * 60}`);
    // 형식이 맞지 않는 값은 받아 주지 않고 새로 만듭니다.
    const odd = saveUser(request("mg_session=not-a-session"), "이상함");
    expect(odd.user.sid).toMatch(/^[0-9a-f]{48}$/);
    expect(odd.user.sid).not.toBe("not-a-session");
  });

  it("marks only the player's own row in a solo game", () => {
    submitRecord("sequence", { owner: "someone-else", name: "순서마" }, 9);
    const { host, act, view } = setup("sequence", ["순서마"]);
    act(host, { type: "start" });
    for (let length = 2; length <= 3; length++) {
      const v = view(host);
      vi.advanceTimersByTime(v.inputAt - Date.now());
      for (const index of v.order) act(host, { type: "pick", index });
    }
    const v = view(host);
    vi.advanceTimersByTime(v.inputAt - Date.now());
    act(host, { type: "pick", index: [...Array(16).keys()].find((i) => i !== v.order[0])! });
    const rows = view(host).boards[0].rows;
    // 닉네임이 같은 다른 기기의 기록은 그대로 있고, 내 것만 표시됩니다.
    expect(rows.map((r) => [r.name, r.value, r.mine])).toEqual([
      ["순서마", 9, false],
      ["순서마", 3, true],
    ]);
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
  /** 신호까지의 대기 시간은 무작위라서, 신호가 뜰 때까지 조금씩 시간을 흘립니다. */
  function waitForGo(view: () => ViewOf<"reaction">) {
    for (let i = 0; i < 100 && view().phase !== "go"; i++) vi.advanceTimersByTime(50);
    expect(view().phase).toBe("go");
  }

  it("restarts the round on a false start and records the average", () => {
    const { host, act, view } = setup("reaction", ["반응가"]);
    act(host, { type: "start" });
    act(host, { type: "tap" });
    expect(view(host)).toMatchObject({ phase: "early", round: 1 });
    vi.advanceTimersByTime(1_400);
    expect(view(host).phase).toBe("wait");

    for (let round = 1; round <= 5; round++) {
      waitForGo(() => view(host));
      expect(view(host).round).toBe(round);
      vi.advanceTimersByTime(250 + round * 10);
      // 기기에서 잰 값이 서버가 본 경과 시간보다 짧으면 그 값을 받습니다(통신 지연 제외).
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
    waitForGo(() => view(host));
    act(host, { type: "tap", ms: 5 });
    expect(view(host).phase).toBe("early");
    vi.advanceTimersByTime(1_400);
    waitForGo(() => view(host));
    vi.advanceTimersByTime(300);
    act(host, { type: "tap", ms: 100_000 });
    // 신호가 뜬 것을 50ms 간격으로 확인했으므로 실제 경과는 300~350ms입니다.
    expect(view(host).times).toHaveLength(1);
    expect(view(host).times[0]).toBeGreaterThanOrEqual(300);
    expect(view(host).times[0]).toBeLessThanOrEqual(350);
  });

  it("restarts the round when the player is too slow", () => {
    const { host, act, view } = setup("reaction", ["반응다"]);
    act(host, { type: "start" });
    waitForGo(() => view(host));
    vi.advanceTimersByTime(3_000);
    expect(view(host)).toMatchObject({ phase: "early", round: 1, times: [] });
  });
});

describe("aim and stairs", () => {
  it("caps aim scores at what is physically possible and records at the end", () => {
    const { host, act, view } = setup("aim", ["에임가"]);
    act(host, { type: "start" });
    expect(view(host).targets).toHaveLength(360);
    expect(view(host).deadline - view(host).startAt).toBe(20_000);
    vi.advanceTimersByTime(3_000 + 1_100);
    act(host, { type: "progress", hits: 9_999, misses: 2 });
    expect(view(host).hits).toBe(10);
    vi.advanceTimersByTime(18_900);
    act(host, { type: "progress", hits: 40, misses: 10, final: true });
    const v = view(host);
    expect(v).toMatchObject({ phase: "result", hits: 40, misses: 10 });
    expect(v.last).toMatchObject({ board: "aim-20", value: 40.08, rank: 1 });
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
    expect(v.last).toMatchObject({ board: "stairs-2", value: 100 });
  });

  it("gets harder in stages: the pace jumps and the pattern stops being a simple coin flip", () => {
    expect(stageOf(0)).toBe(1);
    expect(stageOf(29)).toBe(1);
    expect(stageOf(30)).toBe(2);
    // 단계가 오를 때마다 버텨야 하는 속도가 눈에 띄게 오릅니다.
    for (let stage = 1; stage < 10; stage++) {
      expect(paceOf(stage * 30) - paceOf(stage * 30 - 1)).toBeGreaterThanOrEqual(0.4);
    }
    expect(paceOf(1_999)).toBeLessThanOrEqual(9);
    expect(drainPerMs(300)).toBeGreaterThan(drainPerMs(0) * 4);

    const turns = (text: string) => Array.from(text).filter((ch, i) => i > 0 && ch !== text[i - 1]).length;
    let early = 0;
    let late = 0;
    for (let i = 0; i < 40; i++) {
      const steps = makeSteps(2_000);
      expect(steps).toMatch(/^[LR]{2000}$/);
      early += turns(steps.slice(0, 30));
      late += turns(steps.slice(300, 330));
    }
    // 처음에는 길게 이어지고, 높이 오르면 훨씬 자주 꺾입니다.
    expect(late).toBeGreaterThan(early * 1.3);
  });
});

describe("sequence memory", () => {
  const cards = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("starts at two cards, grows by one on success, and deals a fresh order each time", () => {
    const { host, act, view } = setup("sequence", ["순서가"]);
    act(host, { type: "start" });
    let v = view(host);
    expect(v).toMatchObject({ phase: "play", length: 2, progress: 0, cards: 16 });
    expect(new Set(v.order).size).toBe(2);
    expect(v.inputAt).toBeGreaterThan(v.showAt + 2 * v.stepMs);

    // 순서를 보여 주는 동안 누른 것은 무시합니다.
    act(host, { type: "pick", index: cards(16).find((i) => i !== v.order[0])! });
    expect(view(host)).toMatchObject({ phase: "play", progress: 0 });

    vi.advanceTimersByTime(v.inputAt - Date.now());
    act(host, { type: "pick", index: v.order[0] });
    expect(view(host).progress).toBe(1);
    // 이미 맞힌 카드를 다시 눌러도 틀린 것으로 치지 않습니다.
    act(host, { type: "pick", index: v.order[0] });
    expect(view(host)).toMatchObject({ phase: "play", progress: 1 });
    act(host, { type: "pick", index: v.order[1] });

    v = view(host);
    expect(v).toMatchObject({ phase: "play", length: 3, progress: 0, cleared: 2 });
    expect(new Set(v.order).size).toBe(3);
  });

  it("ends on the first wrong card and records the longest cleared length", () => {
    const { host, act, view } = setup("sequence", ["순서나"]);
    act(host, { type: "start" });
    for (let length = 2; length <= 4; length++) {
      const v = view(host);
      expect(v.length).toBe(length);
      vi.advanceTimersByTime(v.inputAt - Date.now());
      for (const index of v.order) act(host, { type: "pick", index });
    }
    const v = view(host);
    vi.advanceTimersByTime(v.inputAt - Date.now());
    const wrong = cards(16).find((i) => i !== v.order[0])!;
    act(host, { type: "pick", index: wrong });
    const end = view(host);
    expect(end).toMatchObject({ phase: "result", cleared: 4, miss: { picked: wrong, expected: v.order[0] } });
    expect(end.last).toMatchObject({ board: "sequence", value: 4, rank: 1, best: true });
    expect(topRecords("sequence").map((r) => [r.name, r.value])).toEqual([["순서나", 4]]);
  });

  it("does not record a run that fails on the very first round", () => {
    const { host, act, view } = setup("sequence", ["순서다"]);
    act(host, { type: "start" });
    const v = view(host);
    vi.advanceTimersByTime(v.inputAt - Date.now());
    act(host, { type: "pick", index: cards(16).find((i) => i !== v.order[0])! });
    expect(view(host)).toMatchObject({ phase: "result", cleared: 0, last: null });
    expect(topRecords("sequence")).toHaveLength(0);
  });

  it("finishes when all sixteen cards are cleared", () => {
    const { host, act, view } = setup("sequence", ["순서라"]);
    act(host, { type: "start" });
    for (let length = 2; length <= 16; length++) {
      const v = view(host);
      vi.advanceTimersByTime(v.inputAt - Date.now());
      for (const index of v.order) act(host, { type: "pick", index });
    }
    expect(view(host)).toMatchObject({ phase: "result", cleared: 16, miss: null });
    expect(view(host).last).toMatchObject({ value: 16 });
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
