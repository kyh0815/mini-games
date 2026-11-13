import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { BOARDS, getBoard, type BoardRows, type RecordRow } from "@/lib/records";

/**
 * 명예의 전당. 순위표마다 기기별 최고 기록 하나만 둡니다.
 * 기록의 주인은 닉네임이 아니라 기기(쿠키에서 만든 값)로 가립니다. 닉네임은 표시용일 뿐이라
 * 남의 닉네임을 써도 그 사람의 기록을 바꾸거나 지울 수 없습니다.
 * 방이나 세션과 달리 서버를 다시 켜도 남아야 하므로 파일에 저장합니다.
 */
const KEEP = 100;
const DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "records.json");
// 테스트에서는 디스크를 건드리지 않습니다.
const PERSIST = !process.env.VITEST;

/** 파일에 저장하는 기록. owner가 없는 줄은 기기 기준으로 바꾸기 전의 기록입니다. */
type Stored = { name: string; value: number; detail: string; at: number; owner?: string };
export type Who = { owner: string; name: string };

type Store = {
  boards: Map<string, Stored[]>;
  /** 규칙이 바뀌어 더는 보여 주지 않는 예전 순위표. 지우지 않고 파일에 그대로 둡니다. */
  retired: Record<string, unknown>;
  loaded: boolean;
  saving: Promise<void> | null;
  dirty: boolean;
};
const g = globalThis as typeof globalThis & { __miniGamesRecords?: Store };
const store: Store = (g.__miniGamesRecords ??= {
  boards: new Map(),
  retired: {},
  loaded: false,
  saving: null,
  dirty: false,
});

function load(): void {
  if (store.loaded) return;
  store.loaded = true;
  if (!PERSIST || !existsSync(FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Stored[]>;
    store.retired = Object.fromEntries(Object.entries(raw).filter(([key]) => !getBoard(key)));
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

async function write(): Promise<void> {
  await mkdir(DIR, { recursive: true });
  // 쓰는 도중에 꺼져도 기존 파일이 깨지지 않도록 임시 파일에 쓴 뒤 바꿉니다.
  const tmp = `${FILE}.tmp`;
  await writeFile(tmp, JSON.stringify({ ...store.retired, ...Object.fromEntries(store.boards) }));
  await rename(tmp, FILE);
}

/**
 * 파일 쓰기는 요청 처리를 막지 않도록 비동기로 하고, 한 번에 하나씩만 합니다.
 * 쓰는 중에 새 기록이 들어오면 끝난 뒤 최신 상태로 한 번 더 씁니다.
 */
function save(): void {
  if (!PERSIST) return;
  store.dirty = true;
  if (store.saving) return;
  store.saving = (async () => {
    while (store.dirty) {
      store.dirty = false;
      try {
        await write();
      } catch (err) {
        console.error("could not save records file", err);
      }
    }
    store.saving = null;
  })();
}

/**
 * 기록을 올립니다. 그 기기의 기존 기록보다 좋을 때만 바뀝니다.
 * rank는 이번 기록이 순위표에 들어갔다면 그 순위(1부터), best는 개인 최고를 새로 썼는지입니다.
 */
export function submitRecord(
  boardKey: string,
  who: Who,
  value: number,
  detail = "",
): { rank: number; best: boolean } {
  load();
  const board = getBoard(boardKey);
  if (!board || !Number.isFinite(value)) return { rank: 0, best: false };
  const rows = store.boards.get(boardKey) ?? [];
  const isBetter = (a: number, b: number) => (board.better === "low" ? a < b : a > b);
  const mine = rows.find((r) => r.owner === who.owner);
  const best = !mine || isBetter(value, mine.value);
  if (best) {
    const next = rows.filter((r) => r !== mine);
    next.push({ name: who.name, value, detail, at: Date.now(), owner: who.owner });
    next.sort((a, b) => (isBetter(a.value, b.value) ? -1 : isBetter(b.value, a.value) ? 1 : a.at - b.at));
    store.boards.set(boardKey, next.slice(0, KEEP));
    save();
  }
  // 순위는 이번 기록 기준으로 셉니다. 개인 최고가 아니어도 몇 등에 해당하는지 알려 줍니다.
  const current = store.boards.get(boardKey) ?? [];
  const ahead = current.filter((r) => r.owner !== who.owner && isBetter(r.value, value)).length;
  return { rank: ahead + 1, best };
}

/** 닉네임을 바꾸면 그 기기가 세운 기록의 표시 이름도 따라 바뀝니다. */
export function renameOwner(who: Who): void {
  load();
  let changed = false;
  for (const rows of store.boards.values()) {
    for (const row of rows) {
      if (row.owner === who.owner && row.name !== who.name) {
        row.name = who.name;
        changed = true;
      }
    }
  }
  if (changed) save();
}

/** viewer(보는 사람의 기기 값)를 주면 그 사람의 기록에 표시를 합니다. 주인 값은 밖으로 내보내지 않습니다. */
export function topRecords(boardKey: string, limit = 10, viewer?: string): RecordRow[] {
  load();
  return (store.boards.get(boardKey) ?? []).slice(0, limit).map((r) => ({
    name: r.name,
    value: r.value,
    detail: r.detail,
    at: r.at,
    mine: viewer !== undefined && r.owner === viewer,
  }));
}

export function boardsFor(keys: string[], viewer?: string, limit = 10): BoardRows[] {
  return keys.map((key) => ({ key, rows: topRecords(key, limit, viewer) }));
}

export function allBoards(viewer?: string, limit = 20): BoardRows[] {
  return boardsFor(
    BOARDS.map((b) => b.key),
    viewer,
    limit,
  );
}

/** 테스트용: 기록을 모두 지웁니다. */
export function clearRecords(): void {
  store.boards.clear();
  store.loaded = true;
}
