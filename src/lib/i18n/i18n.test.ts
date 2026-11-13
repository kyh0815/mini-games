import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CHARACTERS } from "@/components/arcade/sprites";
import { COLOR_NAMES } from "@/lib/draw";
import { games } from "@/lib/games";
import { BOARDS } from "@/lib/records";
import { RELEASES } from "@/lib/releases";
import { CATEGORY_OPTIONS } from "@/server/data/words";
import { translate } from "./index";
import { JA } from "./ja";

const SRC = path.join(process.cwd(), "src");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sources(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [full] : [];
  });
}

const files = sources(SRC).map((file) => ({ file: path.relative(SRC, file), text: readFileSync(file, "utf8") }));
const hasKorean = (text: string) => /[가-힣]/.test(text);
const unquote = (raw: string) => raw.replace(/\\(["'`\\])/g, "$1").replace(/\\n/g, "\n");

describe("japanese dictionary", () => {
  it("covers every sentence passed to t() or tNow()", () => {
    const call = /\b(?:t|tNow)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;
    const missing: string[] = [];
    for (const { file, text } of files) {
      for (const match of text.matchAll(call)) {
        const key = unquote(match[2]);
        if (hasKorean(key) && !(key in JA)) missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("covers the game list, record boards and other data shown on screen", () => {
    const keys = [
      ...games.flatMap((g) => [g.title, g.description, g.players, ...g.rules]),
      ...BOARDS.flatMap((b) => [b.label, ...b.label.split(" · ").slice(1)]),
      ...CATEGORY_OPTIONS.map((c) => c.label),
      ...COLOR_NAMES,
      ...CHARACTERS.map((c) => c.name),
      ...RELEASES.flatMap((r) => [r.title, ...r.items.map((item) => item.text)]),
      "새로움",
      "바뀜",
      "고침",
    ];
    // 한글이 없는 문구(영문 이름 등)는 옮길 것이 없습니다.
    expect(keys.filter((key) => hasKorean(key) && !(key in JA))).toEqual([]);
  });

  it("covers the messages the server sends", () => {
    const fixed = /(?:GameError|PasswordError)\(\s*"([^"]+)"|\berror:\s*(?:data\.error\s*\?\?\s*)?"([^"]+)"/g;
    const missing: string[] = [];
    for (const { file, text } of files) {
      if (!/^(server|app\/api|lib\/client)/.test(file)) continue;
      for (const match of text.matchAll(fixed)) {
        const key = match[1] ?? match[2];
        if (hasKorean(key) && !(key in JA)) missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
    expect(JA["요청에 실패했습니다."]).toBeTruthy();

    // 값을 끼워 넣어 만드는 문장은 모양으로 옮깁니다.
    const built = [
      "3명 이상 모여야 시작할 수 있습니다.",
      "방이 가득 찼습니다. (최대 12명)",
      "'가' 또는 '나'(으)로 시작해야 합니다.",
      "5칸을 모두 채워 주세요.",
      "서로 다른 숫자 4개를 입력해 주세요.",
      "공지는 80자까지 쓸 수 있습니다.",
      "명중률 93%",
      "14번 뒤집음",
      "최고 157ms",
    ];
    for (const text of built) {
      const out = translate("ja", text);
      expect(out, text).not.toBe(text);
      expect(hasKorean(out.replace(/[가나]/g, "")), out).toBe(false);
    }
  });

  it("keeps the same placeholders and markup in both languages", () => {
    const marks = (text: string) => [...text.matchAll(/\{\w+\}|<\/?\w+>/g)].map((m) => m[0]).sort();
    const broken = Object.entries(JA).filter(([ko, ja]) => marks(ko).join() !== marks(ja).join());
    expect(broken).toEqual([]);
  });

  it("leaves no Korean in the Japanese text and no empty entries", () => {
    const bad = Object.entries(JA).filter(([, ja]) => !ja.trim() || hasKorean(ja));
    expect(bad).toEqual([]);
  });

  it("fills in values and falls back to Korean when there is no translation", () => {
    expect(translate("ko", "{n}명", { n: 3 })).toBe("3명");
    expect(translate("ja", "{n}장에서 틀렸습니다.", { n: 5 })).toBe("5枚で間違えました。");
    expect(translate("ja", "사전에 없는 문장 {n}", { n: 1 })).toBe("사전에 없는 문장 1");
  });
});
