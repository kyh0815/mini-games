import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BOARDS, getBoard, type BoardRows, type RecordRow } from "@/lib/records";

/**
 * 명예의 전당. 순위표마다 사람별 최고 기록 하나만 둡니다.
 * 방이나 세션과 달리 서버를 다시 켜도 남아야 하므로 파일에 저장합니다.
 */
const KEEP = 100;
const DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "records.json");
// 테스트에서는 디스크를 건드리지 않습니다.
const PERSIST = !process.env.VITEST;

type Store = { boards: Map<string, RecordRow[]>; loaded: boolean };
const g = globalThis as typeof globalThis & { __miniGamesRecords?: Store };
const store: Store = (g.__miniGamesRecords ??= { boards: new Map(), loaded: false });

function load(): void {
  if (store.loaded) return;
  store.loaded = true;
  if (!PERSIST || !existsSync(FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, RecordRow[]>;
    for (const board of BOARDS) {
      const rows = Array.isArray(raw[board.key]) ? raw[board.key] : [];
      store.boards.set(
        board.key,
        rows.filter(
          (r) => typeof r?.name === "string" && typeof r?.value === "number" && Number.isFinite(r.value),
        ),
      );
    }
  } catch (err) {
    console.error("could not read records file", err);
  }
}

function save(): void {
  if (!PERSIST) return;
  try {
    mkdirSync(DIR, { recursive: true });
    // 쓰는 도중에 꺼져도 기존 파일이 깨지지 않도록 임시 파일에 쓴 뒤 바꿉니다.
    const tmp = `${FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(store.boards)));
    renameSync(tmp, FILE);
  } catch (err) {
    console.error("could not save records file", err);
  }
}

/**
 * 기록을 올립니다. 그 사람의 기존 기록보다 좋을 때만 바뀝니다.
 * rank는 이번 기록이 순위표에 들어갔다면 그 순위(1부터), best는 개인 최고를 새로 썼는지입니다.
 */
export function submitRecord(
  boardKey: string,
  name: string,
  value: number,
  detail = "",
): { rank: number; best: boolean } {
  load();
  const board = getBoard(boardKey);
  if (!board || !Number.isFinite(value)) return { rank: 0, best: false };
  const rows = store.boards.get(boardKey) ?? [];
  const isBetter = (a: number, b: number) => (board.better === "low" ? a < b : a > b);
  const mine = rows.find((r) => r.name === name);
  const best = !mine || isBetter(value, mine.value);
  if (best) {
    const next = rows.filter((r) => r !== mine);
    next.push({ name, value, detail, at: Date.now() });
    next.sort((a, b) => (isBetter(a.value, b.value) ? -1 : isBetter(b.value, a.value) ? 1 : a.at - b.at));
    store.boards.set(boardKey, next.slice(0, KEEP));
    save();
  }
  // 순위는 이번 기록 기준으로 셉니다. 개인 최고가 아니어도 몇 등에 해당하는지 알려 줍니다.
  const current = store.boards.get(boardKey) ?? [];
  const ahead = current.filter((r) => r.name !== name && !isBetter(value, r.value) && r.value !== value).length;
  return { rank: ahead + 1, best };
}

export function topRecords(boardKey: string, limit = 10): RecordRow[] {
  load();
  return (store.boards.get(boardKey) ?? []).slice(0, limit);
}

export function boardsFor(keys: string[], limit = 10): BoardRows[] {
  return keys.map((key) => ({ key, rows: topRecords(key, limit) }));
}

export function allBoards(limit = 20): BoardRows[] {
  return boardsFor(
    BOARDS.map((b) => b.key),
    limit,
  );
}

/** 테스트용: 기록을 모두 지웁니다. */
export function clearRecords(): void {
  store.boards.clear();
  store.loaded = true;
}
