import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameSlug } from "@/lib/games";
import { chosung } from "@/lib/hangul";
import type { GameAction, RoomView } from "@/lib/types";
import { CATEGORIES } from "../data/words";
import { GameError, createRoom, dispatch, joinRoom, subscribe, viewFor, type Player } from "../rooms";

type ViewOf<G extends GameSlug> = Extract<RoomView, { game: G }>["state"];

/** 방을 만들고 모든 참가자를 접속 상태로 둡니다. */
function setup<G extends GameSlug>(game: G, names: string[]) {
  const { room, player: host } = createRoom(game, names[0]);
  const players = [host, ...names.slice(1).map((name) => joinRoom(room, name))];
  for (const p of players) subscribe(room, p, () => {}, () => {});
  const act = (p: Player, action: GameAction) => dispatch(room, p, action);
  const view = (p: Player) => viewFor(room, p.id).state as ViewOf<G>;
  return { room, players, host, act, view };
}

const byId = (players: Player[], id: string | null) => players.find((p) => p.id === id)!;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("room", () => {
  it("rejects duplicate names and non-host control", () => {
    const { room, players, act } = setup("liar", ["가", "나", "다"]);
    expect(() => joinRoom(room, "가")).toThrow(GameError);
    expect(() => act(players[1], { type: "start" })).toThrow(GameError);
  });

  it("lets the host remove a player in the lobby and invalidates their session", () => {
    const { room, players, host, act } = setup("liar", ["가", "나", "다"]);
    const oldToken = players[1].token;
    act(host, { type: "kick", target: players[1].id });
    expect(room.players.map((p) => p.name)).toEqual(["가", "다"]);
    expect(players[1].token).not.toBe(oldToken);
    expect(() => act(players[2], { type: "kick", target: host.id })).toThrow(GameError);
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
