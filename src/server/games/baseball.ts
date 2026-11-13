import { randomInt } from "node:crypto";
import type { BaseballView } from "@/lib/types";
import { GameError, clearRoomTimer, onlineIds, requireHost, setRoomTimer, shuffle, type Room } from "../rooms";
import type { GameModule } from "./index";

const SETUP_MS = 60_000;
const TURN_MS = 40_000;
const MAX_GUESSES = 60;

type State = {
  phase: BaseballView["phase"];
  digits: number;
  players: string[];
  secrets: Record<string, string>;
  /** 먼저 시작한 사람. 이 사람이 맞히면 상대에게 마지막 기회를 줍니다. */
  starterId: string;
  turnId: string | null;
  guesses: BaseballView["guesses"];
  lastChance: boolean;
  deadline: number;
  totalMs: number;
  winnerId: string | null;
};

function init(): State {
  return {
    phase: "lobby",
    digits: 3,
    players: [],
    secrets: {},
    starterId: "",
    turnId: null,
    guesses: [],
    lastChance: false,
    deadline: 0,
    totalMs: 0,
    winnerId: null,
  };
}

function valid(value: unknown, digits: number): value is string {
  return (
    typeof value === "string" &&
    new RegExp(`^\\d{${digits}}$`).test(value) &&
    new Set(value).size === digits
  );
}

function randomSecret(digits: number): string {
  return shuffle("0123456789".split("")).slice(0, digits).join("");
}

export function judge(secret: string, guess: string): { strike: number; ball: number } {
  let strike = 0;
  let ball = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) strike += 1;
    else if (secret.includes(guess[i])) ball += 1;
  }
  return { strike, ball };
}

const other = (s: State, id: string) => s.players.find((p) => p !== id)!;

function beginPlay(room: Room): void {
  const s = room.state as State;
  // 시간 안에 정하지 못한 사람은 무작위 숫자를 받습니다.
  for (const id of s.players) s.secrets[id] ??= randomSecret(s.digits);
  s.phase = "play";
  s.starterId = s.players[randomInt(2)];
  startTurn(room, s.starterId);
}

function startTurn(room: Room, id: string): void {
  const s = room.state as State;
  s.turnId = id;
  s.totalMs = TURN_MS;
  s.deadline = Date.now() + TURN_MS;
  setRoomTimer(room, TURN_MS, () => {
    if (s.phase === "play" && s.turnId === id) afterTurn(room, id, false);
  });
}

function end(room: Room, winnerId: string | null): void {
  const s = room.state as State;
  clearRoomTimer(room);
  s.phase = "result";
  s.turnId = null;
  s.winnerId = winnerId;
}

/** 한 사람의 차례가 끝난 뒤(맞혔든, 틀렸든, 시간이 지났든) 다음을 정합니다. */
function afterTurn(room: Room, id: string, solved: boolean): void {
  const s = room.state as State;
  const isStarter = id === s.starterId;
  if (s.lastChance) {
    // 먼저 맞힌 사람이 있고, 지금은 상대의 마지막 기회였습니다.
    end(room, solved ? null : s.starterId);
  } else if (solved && isStarter) {
    s.lastChance = true;
    startTurn(room, other(s, id));
  } else if (solved) {
    end(room, id);
  } else if (s.guesses.length >= MAX_GUESSES) {
    end(room, null);
  } else {
    startTurn(room, other(s, id));
  }
}

export const baseballGame: GameModule = {
  init,
  handle(room, player, action, isHost) {
    const s = room.state as State;
    switch (action.type) {
      case "start": {
        requireHost(isHost);
        if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
        const ids = onlineIds(room);
        if (ids.length !== 2) throw new GameError("두 명이 모여야 시작할 수 있습니다.");
        Object.assign(s, init(), {
          phase: "setup",
          digits: action.digits === 4 ? 4 : 3,
          players: ids,
          totalMs: SETUP_MS,
          deadline: Date.now() + SETUP_MS,
        });
        setRoomTimer(room, SETUP_MS, () => {
          if (s.phase === "setup") beginPlay(room);
        });
        return;
      }
      case "secret": {
        if (s.phase !== "setup" || !s.players.includes(player.id)) return;
        if (!valid(action.value, s.digits)) {
          throw new GameError(`서로 다른 숫자 ${s.digits}개를 입력해 주세요.`);
        }
        s.secrets[player.id] = action.value;
        if (s.players.every((id) => id in s.secrets)) beginPlay(room);
        return;
      }
      case "random": {
        if (s.phase !== "setup" || !s.players.includes(player.id)) return;
        s.secrets[player.id] = randomSecret(s.digits);
        if (s.players.every((id) => id in s.secrets)) beginPlay(room);
        return;
      }
      case "guess": {
        if (s.phase !== "play") return;
        if (s.turnId !== player.id) throw new GameError("내 차례가 아닙니다.");
        if (!valid(action.value, s.digits)) {
          throw new GameError(`서로 다른 숫자 ${s.digits}개를 입력해 주세요.`);
        }
        const result = judge(s.secrets[other(s, player.id)], action.value);
        s.guesses.push({ playerId: player.id, guess: action.value, ...result });
        afterTurn(room, player.id, result.strike === s.digits);
        return;
      }
      default:
        throw new GameError("알 수 없는 동작입니다.");
    }
  },
  view(room, playerId): BaseballView {
    const s = room.state as State;
    const done = s.phase === "result";
    return {
      phase: s.phase,
      digits: s.digits,
      players: s.players,
      youPlaying: s.players.includes(playerId),
      // 비밀 숫자는 본인에게만 보냅니다. 끝나면 모두 공개합니다.
      yourSecret: s.secrets[playerId] ?? null,
      ready: Object.keys(s.secrets),
      turnId: s.turnId,
      guesses: s.guesses,
      lastChance: s.lastChance,
      deadline: s.deadline,
      totalMs: s.totalMs,
      winnerId: s.winnerId,
      secrets: done ? s.secrets : null,
    };
  },
};
