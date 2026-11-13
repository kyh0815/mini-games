import { randomInt } from "node:crypto";
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
  record(room, s, "stairs", s.climbed);
}

export const stairsGame: GameModule = {
  init,
  handle(room, _player, action, isHost) {
    const s = room.state as State;
    switch (action.type) {
      case "start": {
        requireHost(isHost);
        let steps = "";
        // 같은 방향이 길게 이어지면 지루하고, 매번 바뀌면 리듬으로만 치게 됩니다.
        let dir = randomInt(2) === 0 ? "L" : "R";
        for (let i = 0; i < STEPS; i++) {
          if (randomInt(100) < 45) dir = dir === "L" ? "R" : "L";
          steps += dir;
        }
        Object.assign(s, init(), { phase: "play", startAt: Date.now() + COUNTDOWN_MS, steps });
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
      ...soloView(s, ["stairs"]),
      phase: s.phase,
      startAt: s.startAt,
      steps: s.steps,
      climbed: s.climbed,
    };
  },
};
