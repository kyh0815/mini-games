import { randomInt } from "node:crypto";
import { stageOf } from "@/lib/stairs";
import type { StairsView } from "@/lib/types";
import { GameError, clearRoomTimer, requireHost, setRoomTimer, type Room } from "../rooms";
import type { GameModule } from "./index";
import { record, soloView, type SoloState } from "./solo";

const COUNTDOWN_MS = 3_000;
const STEPS = 2_000;
const MAX_MS = 5 * 60_000;
/** 사람이 낼 수 있는 가장 빠른 연타 간격 */
const MIN_STEP_MS = 60;

type State = SoloState & {
  phase: StairsView["phase"];
  startAt: number;
  steps: string;
  climbed: number;
};

function init(): State {
  return { phase: "lobby", startAt: 0, steps: "", climbed: 0, last: null };
}

/**
 * 계단 방향을 만듭니다. 처음 두 단계는 단순한 무작위이고,
 * 그 뒤로는 성격이 다른 짧은 구간(직진, 지그재그, 두 칸씩, 속임수)을 섞어 리듬을 읽기 어렵게 합니다.
 * 단계가 오를수록 구간이 짧아져 패턴이 더 자주 바뀝니다.
 */
export function makeSteps(total: number): string {
  let out = "";
  let dir: "L" | "R" = randomInt(2) === 0 ? "L" : "R";
  const flip = () => {
    dir = dir === "L" ? "R" : "L";
  };
  const put = () => {
    out += dir;
  };
  while (out.length < total) {
    const stage = stageOf(out.length);
    if (stage <= 2) {
      if (randomInt(100) < (stage === 1 ? 30 : 45)) flip();
      put();
      continue;
    }
    const n = 2 + randomInt(Math.max(2, 8 - stage));
    switch (randomInt(5)) {
      case 0: // 한쪽으로 쭉
        flip();
        for (let i = 0; i < n; i++) put();
        break;
      case 1: // 매번 꺾기
        for (let i = 0; i < n; i++) {
          flip();
          put();
        }
        break;
      case 2: // 두 칸씩 꺾기
        for (let i = 0; i < n; i++) {
          if (i % 2 === 0) flip();
          put();
        }
        break;
      case 3: // 쭉 가다가 한 칸만 반대로
        for (let i = 0; i < n; i++) put();
        flip();
        put();
        flip();
        put();
        break;
      default: // 완전 무작위
        for (let i = 0; i < n; i++) {
          if (randomInt(2) === 0) flip();
          put();
        }
    }
  }
  return out.slice(0, total);
}

function accept(s: State, raw: unknown): void {
  const climbed = Number(raw);
  if (!Number.isInteger(climbed) || climbed < 0) return;
  const possible = Math.max(0, Math.floor((Date.now() - s.startAt) / MIN_STEP_MS));
  s.climbed = Math.max(s.climbed, Math.min(climbed, possible, STEPS));
}

function finish(room: Room): void {
  const s = room.state as State;
  if (s.phase !== "play") return;
  clearRoomTimer(room);
  s.phase = "result";
  record(room, s, "stairs-2", s.climbed);
}

export const stairsGame: GameModule = {
  init,
  handle(room, _player, action, isHost) {
    const s = room.state as State;
    switch (action.type) {
      case "start": {
        requireHost(isHost);
        Object.assign(s, init(), {
          phase: "play",
          startAt: Date.now() + COUNTDOWN_MS,
          steps: makeSteps(STEPS),
        });
        setRoomTimer(room, COUNTDOWN_MS + MAX_MS, () => finish(room));
        return;
      }
      case "progress":
        if (s.phase === "play") accept(s, action.climbed);
        return "quiet";
      case "out":
        if (s.phase !== "play") return;
        accept(s, action.climbed);
        finish(room);
        return;
      default:
        throw new GameError("알 수 없는 동작입니다.");
    }
  },
  view(room): StairsView {
    const s = room.state as State;
    return {
      ...soloView(room, s, ["stairs-2"]),
      phase: s.phase,
      startAt: s.startAt,
      steps: s.steps,
      climbed: s.climbed,
    };
  },
};
