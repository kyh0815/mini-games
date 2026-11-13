import { randomInt } from "node:crypto";
import type { SnakeView } from "@/lib/types";
import { GameError, onlineIds, requireHost, setRoomTimer, type Room } from "../rooms";
import type { GameModule } from "./index";

const WIDTH = 34;
const HEIGHT = 22;
const COUNTDOWN_MS = 3_000;
const MAX_MS = 3 * 60_000;
const TICK_MS = { slow: 170, normal: 130, fast: 95 } as const;
const START_LENGTH = 4;

type Dir = "U" | "D" | "L" | "R";
const DELTA: Record<Dir, [number, number]> = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const OPPOSITE: Record<Dir, Dir> = { U: "D", D: "U", L: "R", R: "L" };

type Snake = {
  id: string;
  /** 머리가 맨 앞 */
  body: [number, number][];
  dir: Dir;
  /** 다음 틱에 적용할 방향 입력. 한 틱에 두 번 꺾어 제 몸에 부딪히는 일을 막습니다. */
  queue: Dir[];
  alive: boolean;
  score: number;
};

type State = {
  phase: SnakeView["phase"];
  snakes: Snake[];
  foods: [number, number][];
  startAt: number;
  deadline: number;
  tickMs: number;
  winnerId: string | null;
};

function init(): State {
  return { phase: "lobby", snakes: [], foods: [], startAt: 0, deadline: 0, tickMs: 130, winnerId: null };
}

/** 시작 위치: 판 둘레에 고르게 놓고 모두 안쪽을 향하게 합니다. */
function spawn(ids: string[]): Snake[] {
  const slots: { x: number; y: number; dir: Dir }[] = [
    { x: 5, y: 4, dir: "R" },
    { x: WIDTH - 6, y: HEIGHT - 5, dir: "L" },
    { x: WIDTH - 6, y: 4, dir: "L" },
    { x: 5, y: HEIGHT - 5, dir: "R" },
    { x: 5, y: 11, dir: "R" },
    { x: WIDTH - 6, y: 11, dir: "L" },
    { x: 17, y: 3, dir: "D" },
    { x: 17, y: HEIGHT - 4, dir: "U" },
  ];
  return ids.map((id, i) => {
    const slot = slots[i % slots.length];
    const [dx, dy] = DELTA[slot.dir];
    const body: [number, number][] = [];
    for (let n = 0; n < START_LENGTH; n++) body.push([slot.x - dx * n, slot.y - dy * n]);
    return { id, body, dir: slot.dir, queue: [], alive: true, score: 0 };
  });
}

function occupied(s: State): Set<number> {
  const cells = new Set<number>();
  for (const snake of s.snakes) {
    if (snake.alive) for (const [x, y] of snake.body) cells.add(y * WIDTH + x);
  }
  for (const [x, y] of s.foods) cells.add(y * WIDTH + x);
  return cells;
}

function addFood(s: State): void {
  const taken = occupied(s);
  for (let tries = 0; tries < 200; tries++) {
    const x = randomInt(WIDTH);
    const y = randomInt(HEIGHT);
    if (!taken.has(y * WIDTH + x)) {
      s.foods.push([x, y]);
      return;
    }
  }
}

function finish(s: State): void {
  s.phase = "result";
  const alive = s.snakes.filter((x) => x.alive);
  if (alive.length === 1 && s.snakes.length > 1) {
    s.winnerId = alive[0].id;
    return;
  }
  // 동시에 탈락했거나 혼자 한 판은 점수로 가립니다.
  const best = [...s.snakes].sort((a, b) => b.score - a.score);
  const tied = best.length > 1 && best[0].score === best[1].score;
  s.winnerId = tied ? null : (best[0]?.id ?? null);
}

function tick(room: Room): void {
  const s = room.state as State;
  if (s.phase !== "play") return;
  const moving = s.snakes.filter((x) => x.alive);
  const heads = new Map<string, [number, number]>();
  for (const snake of moving) {
    const next = snake.queue.shift();
    if (next && next !== OPPOSITE[snake.dir]) snake.dir = next;
    const [dx, dy] = DELTA[snake.dir];
    heads.set(snake.id, [snake.body[0][0] + dx, snake.body[0][1] + dy]);
  }
  // 이번 틱에 꼬리가 빠지는 칸은 비는 것으로 봅니다(먹이를 먹는 뱀은 꼬리가 남습니다).
  const eats = new Set<string>();
  for (const snake of moving) {
    const [hx, hy] = heads.get(snake.id)!;
    if (s.foods.some(([x, y]) => x === hx && y === hy)) eats.add(snake.id);
  }
  const blocked = new Set<number>();
  for (const snake of moving) {
    const body = eats.has(snake.id) ? snake.body : snake.body.slice(0, -1);
    for (const [x, y] of body) blocked.add(y * WIDTH + x);
  }
  const dead = new Set<string>();
  for (const snake of moving) {
    const [hx, hy] = heads.get(snake.id)!;
    if (hx < 0 || hy < 0 || hx >= WIDTH || hy >= HEIGHT || blocked.has(hy * WIDTH + hx)) {
      dead.add(snake.id);
      continue;
    }
    // 머리끼리 같은 칸으로 들어오면 둘 다 탈락합니다.
    for (const rival of moving) {
      if (rival === snake) continue;
      const [rx, ry] = heads.get(rival.id)!;
      if (rx === hx && ry === hy) dead.add(snake.id);
    }
  }
  for (const snake of moving) {
    if (dead.has(snake.id)) {
      snake.alive = false;
      continue;
    }
    const head = heads.get(snake.id)!;
    snake.body.unshift(head);
    if (eats.has(snake.id)) {
      snake.score += 1;
      s.foods = s.foods.filter(([x, y]) => x !== head[0] || y !== head[1]);
    } else {
      snake.body.pop();
    }
  }
  const alive = s.snakes.filter((x) => x.alive).length;
  while (s.foods.length < Math.max(2, Math.ceil(alive / 2) + 1)) addFood(s);

  const over = s.snakes.length > 1 ? alive <= 1 : alive === 0;
  if (over || Date.now() >= s.deadline) {
    finish(s);
    return;
  }
  setRoomTimer(room, s.tickMs, () => tick(room));
}

export const snakeGame: GameModule = {
  init,
  handle(room, player, action, isHost) {
    const s = room.state as State;
    if (action.type === "start") {
      requireHost(isHost);
      if (s.phase !== "lobby") throw new GameError("이미 진행 중입니다.");
      const speed = (Object.keys(TICK_MS) as (keyof typeof TICK_MS)[]).find((k) => k === action.speed);
      const startAt = Date.now() + COUNTDOWN_MS;
      Object.assign(s, init(), {
        phase: "play",
        snakes: spawn(onlineIds(room)),
        startAt,
        deadline: startAt + MAX_MS,
        tickMs: TICK_MS[speed ?? "normal"],
      });
      for (let i = 0; i < 3; i++) addFood(s);
      setRoomTimer(room, COUNTDOWN_MS, () => tick(room));
      return;
    }
    if (action.type === "turn") {
      const snake = s.snakes.find((x) => x.id === player.id);
      const dir = action.dir;
      if (s.phase !== "play" || !snake?.alive) return "quiet";
      if (dir !== "U" && dir !== "D" && dir !== "L" && dir !== "R") return "quiet";
      // 방향은 마지막으로 예약된 방향을 기준으로 따집니다. 두 개까지 미리 받아 둡니다.
      const last = snake.queue[snake.queue.length - 1] ?? snake.dir;
      if (dir !== last && dir !== OPPOSITE[last] && snake.queue.length < 2) snake.queue.push(dir);
      return "quiet";
    }
    throw new GameError("알 수 없는 동작입니다.");
  },
  view(room): SnakeView {
    const s = room.state as State;
    return {
      phase: s.phase,
      width: WIDTH,
      height: HEIGHT,
      startAt: s.startAt,
      deadline: s.deadline,
      snakes: s.snakes.map((x) => ({ id: x.id, body: x.body.flat(), alive: x.alive, score: x.score })),
      foods: s.foods.flat(),
      winnerId: s.winnerId,
    };
  },
};
