import { randomInt } from "node:crypto";
import type { AimView } from "@/lib/types";
import { GameError, requireHost, setRoomTimer, type Room } from "../rooms";
import type { GameModule } from "./index";
import { record, soloView, type SoloState } from "./solo";

const COUNTDOWN_MS = 3_000;
const PLAY_MS = 20_000;
/** 마지막 보고가 도착할 여유 */
const GRACE_MS = 600;
const TARGETS = 180;
/** 사람이 낼 수 있는 가장 빠른 연속 명중 간격 */
const MIN_HIT_MS = 110;

type State = SoloState & {
  phase: AimView["phase"];
  startAt: number;
  deadline: number;
  targets: number[];
  hits: number;
  misses: number;
};

function init(): State {
  return { phase: "lobby", startAt: 0, deadline: 0, targets: [], hits: 0, misses: 0, last: null };
}

function finish(room: Room): void {
  const s = room.state as State;
  if (s.phase !== "play") return;
  s.phase = "result";
  const shots = s.hits + s.misses;
  const accuracy = shots > 0 ? Math.round((s.hits / shots) * 100) : 0;
  // 점수가 같으면 명중률이 높은 쪽이 위로 가도록 소수 자리에 명중률을 싣습니다.
  record(room, s, "aim-20", s.hits + accuracy / 1000, `명중률 ${accuracy}%`);
}

export const aimGame: GameModule = {
  init,
  handle(room, _player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      const targets: number[] = [];
      for (let i = 0; i < TARGETS; i++) targets.push(60 + randomInt(881), 90 + randomInt(821));
      const startAt = Date.now() + COUNTDOWN_MS;
      Object.assign(s, init(), { phase: "play", startAt, deadline: startAt + PLAY_MS, targets });
      setRoomTimer(room, COUNTDOWN_MS + PLAY_MS + GRACE_MS, () => finish(room));
      return;
    }
    if (action.type === "progress") {
      if (s.phase !== "play") return "quiet";
      const hits = Number(action.hits);
      const misses = Number(action.misses);
      if (!Number.isInteger(hits) || !Number.isInteger(misses) || hits < 0 || misses < 0) return "quiet";
      const elapsed = Math.min(Date.now(), s.deadline + GRACE_MS) - s.startAt;
      const possible = Math.max(0, Math.floor(elapsed / MIN_HIT_MS));
      s.hits = Math.max(s.hits, Math.min(hits, possible, TARGETS));
      s.misses = Math.max(s.misses, Math.min(misses, 2_000));
      if (action.final === true && Date.now() >= s.deadline) finish(room);
      else return "quiet";
      return;
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room): AimView {
    const s = room.state as State;
    return {
      ...soloView(room, s, ["aim-20"]),
      phase: s.phase,
      startAt: s.startAt,
      deadline: s.deadline,
      targets: s.targets,
      hits: s.hits,
      misses: s.misses,
    };
  },
};
