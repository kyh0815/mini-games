import { describe, expect, it } from "vitest";
import { chosung, nextStarts, normalize, strokes } from "./hangul";

describe("chosung", () => {
  it("extracts initial consonants and keeps other characters", () => {
    expect(chosung("사과 주스")).toBe("ㅅㄱ ㅈㅅ");
    expect(chosung("떡볶이")).toBe("ㄸㅂㅇ");
    expect(chosung("A4 용지")).toBe("A4 ㅇㅈ");
  });
});

describe("strokes", () => {
  it("counts keystrokes on a two-set keyboard", () => {
    expect(strokes("가")).toBe(2);
    expect(strokes("각")).toBe(3);
    expect(strokes("과")).toBe(3); // ㄱ + ㅗ + ㅏ
    expect(strokes("닭")).toBe(4); // ㄷ + ㅏ + ㄹ + ㄱ
    expect(strokes("a b.")).toBe(4);
  });
});

describe("nextStarts", () => {
  it("allows the initial sound rule variants", () => {
    expect(nextStarts("량")).toEqual(["량", "양"]);
    expect(nextStarts("라")).toEqual(["라", "나"]);
    expect(nextStarts("녀")).toEqual(["녀", "여"]);
  });
  it("returns only the character itself when no rule applies", () => {
    expect(nextStarts("과")).toEqual(["과"]);
    expect(nextStarts("나")).toEqual(["나"]);
  });
});

describe("normalize", () => {
  it("ignores whitespace and case", () => {
    expect(normalize(" 김치 찌개 ")).toBe("김치찌개");
    expect(normalize("ABC")).toBe("abc");
  });
});
