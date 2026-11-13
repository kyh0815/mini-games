import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSlug } from "@/lib/games";
import { chosung } from "@/lib/hangul";
import type { GameAction, RoomView, Stroke } from "@/lib/types";
import { CATEGORIES } from "../data/words";
import { GameError, createRoom, dispatch, getRoom, joinRoom, subscribe, viewFor, type Player } from "../rooms";
import type { User } from "../session";

type ViewOf<G extends GameSlug> = Extract<RoomView, { game: G }>["state"];

let seq = 0;
function user(name: string): User {
  seq += 1;
  return { id: `u${seq}`, sid: `s${seq}`, name, connections: 1, lastSeen: 0 };
}

/** 방을 만들고 모든 참가자를 접속 상태로 둡니다. */
function setup<G extends GameSlug>(game: G, names: string[]) {
  const users = names.map(user);
  const room = createRoom(game, users[0]);
  const players = users.map((u) => joinRoom(room, u));
  /** 참가자별로 받은 이벤트(그림 획 등) */
  const events = new Map<string, { event: string; data: unknown }[]>();
  const closers = players.map((p) => {
    events.set(p.id, []);
    return subscribe(room, p, {
      push: () => {},
      send: (event, data) => events.get(p.id)!.push({ event, data }),
      end: () => {},
    });
  });
  const act = (p: Player, action: GameAction) => dispatch(room, p, action);
  const view = (p: Player) => viewFor(room, p.id).state as ViewOf<G>;
  return { room, users, players, host: players[0], act, view, events, closers };
}

const byId = (players: Player[], id: string | null) => players.find((p) => p.id === id)!;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  // 걸려 있던 타이머(로비 알림 묶음 등)를 비우고 끝냅니다.
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("room", () => {
  it("returns the same seat when a player joins twice and rejects non-host control", () => {
    const { room, users, players, act } = setup("liar", ["가", "나", "다"]);
    expect(joinRoom(room, users[1])).toBe(players[1]);
    expect(room.players).toHaveLength(3);
    expect(() => act(players[1], { type: "start" })).toThrow(GameError);
  });

  it("lets the host remove a player in the lobby and keeps them out", () => {
    const { room, users, players, host, act } = setup("liar", ["가", "나", "다"]);
    act(host, { type: "kick", target: players[1].id });
    expect(room.players.map((p) => p.name)).toEqual(["가", "다"]);
    expect(() => joinRoom(room, users[1])).toThrow(GameError);
    expect(() => act(players[2], { type: "kick", target: host.id })).toThrow(GameError);
  });

  it("closes the room when the last player leaves", () => {
    const { room, host, act } = setup("liar", ["가"]);
    act(host, { type: "leave" });
    expect(getRoom(room.code)).toBeUndefined();
  });

  it("removes a player who stays disconnected in the lobby", () => {
    const { room, players, closers } = setup("liar", ["가", "나"]);
    closers[1]();
    expect(room.players).toHaveLength(2);
    vi.advanceTimersByTime(6_000);
    expect(room.players).toEqual([players[0]]);
  });

  it("hands the host role over when the host leaves", () => {
    const { room, players, host, act } = setup("liar", ["가", "나", "다"]);
    act(host, { type: "leave" });
    expect(room.hostId).toBe(players[1].id);
    expect(room.players).not.toContain(host);
  });
});

describe("liar", () => {
  function started() {
    const ctx = setup("liar", ["가", "나", "다", "라"]);
    ctx.act(ctx.host, { type: "start", category: "food" });
    const liar = ctx.players.find((p) => ctx.view(p).youAreLiar)!;
    const citizens = ctx.players.filter((p) => p !== liar);
    return { ...ctx, liar, citizens };
  }

  it("needs three players", () => {
    const { host, act } = setup("liar", ["가", "나"]);
    expect(() => act(host, { type: "start" })).toThrow(GameError);
  });

  it("never sends the word or the liar's identity to the wrong player", () => {
    const { players, liar, citizens, view } = started();
    expect(players.filter((p) => view(p).youAreLiar)).toHaveLength(1);
    expect(view(liar).word).toBeNull();
    for (const p of citizens) {
      expect(view(p).word).toBeTruthy();
      expect(view(p).liarId).toBeNull();
    }
  });

  it("lets a caught liar win by guessing the word", () => {
    const { host, liar, citizens, act, view } = started();
    const word = view(citizens[0]).word!;
    act(host, { type: "startVote" });
    expect(() => act(host, { type: "vote", target: host.id })).toThrow(GameError);
    for (const p of citizens) act(p, { type: "vote", target: liar.id });
    expect(view(host).phase).toBe("vote");
    act(liar, { type: "vote", target: citizens[0].id });
    expect(view(host).phase).toBe("guess");
    expect(() => act(citizens[0], { type: "guess", text: word })).toThrow(GameError);
    act(liar, { type: "guess", text: ` ${word} ` });
    expect(view(host)).toMatchObject({ phase: "result", winner: "liar" });
  });

  it("gives citizens the win when the caught liar runs out of time", () => {
    const { host, liar, citizens, act, view } = started();
    act(host, { type: "startVote" });
    for (const p of citizens) act(p, { type: "vote", target: liar.id });
    act(host, { type: "closeVote" });
    vi.advanceTimersByTime(30_000);
    expect(view(host)).toMatchObject({ phase: "result", winner: "citizens" });
  });

  it("lets the liar win on a tied vote", () => {
    const { host, citizens, act, view } = started();
    act(host, { type: "startVote" });
    act(citizens[0], { type: "vote", target: citizens[1].id });
    act(citizens[1], { type: "vote", target: citizens[0].id });
    act(host, { type: "closeVote" });
    expect(view(host)).toMatchObject({ phase: "result", winner: "liar", accusedId: null });
  });
});

describe("wordchain", () => {
  function started(names = ["가", "나", "다"]) {
    const ctx = setup("wordchain", names);
    ctx.act(ctx.host, { type: "start", turnSeconds: 10 });
    const current = () => byId(ctx.players, ctx.view(ctx.host).turnId);
    const say = (text: string) => ctx.act(current(), { type: "word", text });
    return { ...ctx, current, say };
  }

  it("validates turn order, format, linking and reuse", () => {
    const { players, act, current, say, view, host } = started();
    const other = players.find((p) => p !== current())!;
    expect(() => act(other, { type: "word", text: "사과" })).toThrow(GameError);
    expect(() => say("apple")).toThrow(GameError);
    say("선량");
    expect(view(host).starts).toEqual(["량", "양"]);
    expect(() => say("사과")).toThrow(GameError);
    say("양파");
    say("파랑");
    expect(() => say("양파")).toThrow(GameError);
  });

  it("voids a word when a majority objects and restores the previous link", () => {
    const { players, act, say, view, host } = started();
    say("기차");
    say("차표");
    const author = byId(players, view(host).chain.at(-1)!.playerId);
    const objectors = players.filter((p) => p !== author);
    expect(() => act(author, { type: "object" })).toThrow(GameError);
    act(objectors[0], { type: "object" });
    expect(view(host).chain).toHaveLength(2);
    act(objectors[1], { type: "object" });
    expect(view(host).chain).toHaveLength(1);
    expect(view(host).lives[author.id]).toBe(2);
    expect(view(host).starts).toEqual(["차"]);
    expect(view(host).lastEvent).toMatchObject({ type: "rejected", word: "차표" });
  });

  it("costs a life on timeout and lets the next player start fresh", () => {
    const { say, current, view, host } = started();
    say("기차");
    const slow = current();
    vi.advanceTimersByTime(10_000);
    expect(view(host).lives[slow.id]).toBe(2);
    expect(view(host).starts).toBeNull();
    expect(view(host).turnId).not.toBe(slow.id);
  });

  it("ends when one player is left", () => {
    const { view, host } = started(["가", "나"]);
    vi.advanceTimersByTime(10_000 * 5);
    const s = view(host);
    expect(s.phase).toBe("result");
    expect(s.lives[s.winnerId!]).toBeGreaterThan(0);
  });
});

describe("typing", () => {
  it("hides the text during the countdown and only accepts an exact finish", () => {
    const { players, host, act, view } = setup("typing", ["가", "나"]);
    act(host, { type: "start", length: "short" });
    expect(view(host)).toMatchObject({ phase: "race", text: "" });
    vi.advanceTimersByTime(4_000);
    const text = view(host).text;
    expect(text.length).toBeGreaterThan(10);

    vi.advanceTimersByTime(1_000);
    act(host, { type: "progress", chars: 9999 });
    expect(view(host).progress[host.id]).toEqual({ chars: text.length - 1, finishedMs: null });
    expect(() => act(host, { type: "finish", typed: `${text}!` })).toThrow(GameError);

    vi.advanceTimersByTime(4_000);
    act(players[1], { type: "finish", typed: text });
    expect(view(host).phase).toBe("race");
    act(host, { type: "finish", typed: text });
    expect(view(host).phase).toBe("result");
    expect(view(host).progress[players[1].id].finishedMs).toBe(5_000);
  });

  it("ends at the time limit even if nobody finishes", () => {
    const { host, act, view } = setup("typing", ["가"]);
    act(host, { type: "start" });
    vi.advanceTimersByTime(4_000 + 120_000);
    expect(view(host).phase).toBe("result");
  });
});

describe("chosung", () => {
  const sports = CATEGORIES.find((c) => c.key === "sports")!.words;

  it("scores the first correct answer and moves on", () => {
    const { players, host, act, view } = setup("chosung", ["가", "나"]);
    act(host, { type: "start", category: "sports", rounds: 5 });
    const q = view(host);
    expect(q).toMatchObject({ phase: "question", answer: null, totalRounds: 5, category: "스포츠" });

    act(players[1], { type: "answer", text: "틀린답" });
    expect(view(host).guesses).toHaveLength(1);

    const answer = sports.find((w) => chosung(w) === q.chosung)!;
    act(players[1], { type: "answer", text: answer });
    expect(view(host)).toMatchObject({ phase: "reveal", winnerId: players[1].id, answer });
    expect(view(host).scores[players[1].id]).toBe(1);

    vi.advanceTimersByTime(3_500);
    expect(view(host)).toMatchObject({ phase: "question", round: 2 });
  });

  it("gives a hint, then reveals the answer when time runs out", () => {
    const { host, act, view } = setup("chosung", ["가"]);
    act(host, { type: "start", category: "all", rounds: 5 });
    vi.advanceTimersByTime(10_000);
    expect(view(host).hint).toHaveLength(1);
    vi.advanceTimersByTime(10_000);
    expect(view(host)).toMatchObject({ phase: "reveal", winnerId: null });
    expect(view(host).answer).toBeTruthy();
  });

  it("finishes after the last round", () => {
    const { host, act, view } = setup("chosung", ["가"]);
    act(host, { type: "start", category: "all", rounds: 5 });
    vi.advanceTimersByTime((20_000 + 3_500) * 5);
    expect(view(host).phase).toBe("result");
  });
});

describe("draw", () => {
  function started() {
    const ctx = setup("draw", ["가", "나", "다"]);
    ctx.act(ctx.host, { type: "start", category: "animal", cycles: 1, drawSeconds: 60 });
    const drawer = () => ctx.players.find((p) => ctx.view(p).youAreDrawer)!;
    const guessers = () => ctx.players.filter((p) => p !== drawer());
    return { ...ctx, drawer, guessers };
  }

  it("shows the word choices only to the drawer and hides the word from guessers", () => {
    const { drawer, guessers, act, view } = started();
    expect(view(drawer()).choices).toHaveLength(3);
    for (const p of guessers()) expect(view(p).choices).toBeNull();

    const word = view(drawer()).choices![1];
    act(drawer(), { type: "choose", index: 1 });
    expect(view(drawer())).toMatchObject({ phase: "draw", word });
    for (const p of guessers()) {
      expect(view(p).word).toBeNull();
      expect(view(p).mask).toBe("_".repeat(word.length));
    }
  });

  it("picks a word automatically when the drawer does not choose", () => {
    const { drawer, view } = started();
    const first = view(drawer()).choices![0];
    vi.advanceTimersByTime(12_000);
    expect(view(drawer())).toMatchObject({ phase: "draw", word: first });
  });

  it("accepts any brush size in range", () => {
    const { drawer, guessers, act, events } = started();
    act(drawer(), { type: "choose", index: 0 });
    act(drawer(), { type: "stroke", id: "thin", color: "#1d1d21", size: 2, points: [1, 1] });
    act(drawer(), { type: "stroke", id: "mid", color: "#1d1d21", size: 17, points: [2, 2] });
    act(drawer(), { type: "stroke", id: "thick", color: "#1d1d21", size: 60, points: [3, 3] });
    const sizes = events
      .get(guessers()[0].id)!
      .filter((e) => e.event === "stroke")
      .map((e) => (e.data as Stroke).size);
    expect(sizes).toEqual([2, 17, 60]);
  });

  it("relays strokes to the others without resending the whole view", () => {
    const { drawer, guessers, act, events } = started();
    act(drawer(), { type: "choose", index: 0 });
    const stroke = { type: "stroke", id: "a1", color: "#d9483b", size: 10, points: [10, 20, 30, 40] };
    act(drawer(), stroke);
    act(drawer(), { ...stroke, points: [50, 60] });
    act(guessers()[0], { ...stroke, id: "hack" });

    const got = events.get(guessers()[0].id)!.filter((e) => e.event === "stroke");
    expect(got).toHaveLength(2);
    expect(got[0].data).toMatchObject({ id: "a1", points: [10, 20, 30, 40] });
    expect(events.get(drawer().id)!.filter((e) => e.event === "stroke")).toHaveLength(0);

    // 뒤늦게 들어온 사람에게는 지금까지의 그림 전체를 보냅니다.
    act(drawer(), { type: "undo" });
    const canvas = events.get(guessers()[0].id)!.filter((e) => e.event === "canvas").at(-1)!;
    expect(canvas.data as Stroke[]).toHaveLength(0);
  });

  it("ignores malformed stroke data", () => {
    const { drawer, guessers, act, events } = started();
    act(drawer(), { type: "choose", index: 0 });
    act(drawer(), { type: "stroke", id: "a", color: "red", size: 999, points: [1, 2, 3] });
    act(drawer(), { type: "stroke", id: "a", points: "nope" });
    act(drawer(), { type: "stroke", id: "b", color: "javascript:x", size: 3, points: [-50, 5000] });
    const got = events.get(guessers()[0].id)!.filter((e) => e.event === "stroke");
    expect(got).toHaveLength(1);
    expect(got[0].data).toMatchObject({ color: "#1d1d21", size: 3, points: [0, 1000] });
  });

  it("shows every message in chat and only accepts the exact word", () => {
    const { drawer, guessers, act, view, host } = started();
    act(drawer(), { type: "choose", index: 0 });
    const d = drawer();
    const [g1, g2] = guessers();
    const word = view(d).word!;
    const texts = () => view(host).chat.filter((m) => m.kind === "chat").map((m) => m.text);

    expect(() => act(d, { type: "guess", text: word })).toThrow(GameError);
    // 정답의 일부, 정답을 포함한 더 긴 말은 정답이 아닙니다.
    act(g1, { type: "guess", text: word.slice(0, -1) });
    act(g2, { type: "guess", text: `${word}요` });
    act(g1, { type: "guess", text: "전혀 다른 말" });
    expect(view(host).phase).toBe("draw");
    expect(texts()).toEqual([word.slice(0, -1), `${word}요`, "전혀 다른 말"]);
    expect(view(host).scores[g1.id]).toBe(0);
  });

  it("ends the turn as soon as someone gets it and scores both players", () => {
    const { drawer, guessers, act, view, host } = started();
    act(drawer(), { type: "choose", index: 0 });
    const d = drawer();
    const [g1, g2] = guessers();
    const word = view(d).word!;

    vi.advanceTimersByTime(15_000);
    act(g1, { type: "guess", text: ` ${word} ` });
    // 한 명이 맞히면 남은 시간과 상관없이 바로 공개 단계로 넘어갑니다.
    expect(view(g2)).toMatchObject({ phase: "reveal", word, guessed: { [g1.id]: 85 } });
    expect(view(host).scores[g1.id]).toBe(85);
    expect(view(host).scores[d.id]).toBe(43);
    // 맞힌 말도 채팅에 그대로 남습니다.
    expect(view(host).chat.map((m) => m.text)).toContain(word);
    expect(view(host).chat.at(-1)).toMatchObject({ kind: "correct" });

    vi.advanceTimersByTime(5_000);
    expect(view(host).phase).toBe("choose");
    expect(view(host).drawerId).not.toBe(d.id);
  });

  it("opens the initial-consonant hint halfway and finishes after every player has drawn", () => {
    const { drawer, guessers, act, view, host } = started();
    act(drawer(), { type: "choose", index: 0 });
    const word = view(drawer()).word!;
    vi.advanceTimersByTime(30_000);
    expect(view(guessers()[0]).mask).toBe(chosung(word));
    vi.advanceTimersByTime(30_000);
    expect(view(host).phase).toBe("reveal");
    // 남은 두 차례: 고르기 12초 + 그리기 60초 + 공개 5초
    vi.advanceTimersByTime(5_000 + (12_000 + 60_000 + 5_000) * 2);
    expect(view(host).phase).toBe("result");
  });
});
