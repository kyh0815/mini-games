const BASE = 0xac00;
const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
// 중성 index: ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ
const COMPOUND_JUNG = new Set([9, 10, 11, 14, 15, 16, 19]);
// 종성 index (0 = 없음): 겹받침 ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ
const COMPOUND_JONG = new Set([3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 18]);
const CHO_N = 2;
const CHO_R = 5;
const CHO_IEUNG = 11;
// ㅑㅕㅖㅛㅠㅣ (+ㅒ)
const Y_VOWELS = new Set([2, 3, 6, 7, 12, 17, 20]);

function decompose(ch: string): [number, number, number] | null {
  const code = ch.charCodeAt(0) - BASE;
  if (ch.length !== 1 || code < 0 || code > 11171) return null;
  return [Math.floor(code / 588), Math.floor((code % 588) / 28), code % 28];
}

function compose(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(BASE + cho * 588 + jung * 28 + jong);
}

/** "사과 주스" → "ㅅㄱ ㅈㅅ" */
export function chosung(text: string): string {
  return Array.from(text)
    .map((ch) => {
      const d = decompose(ch);
      return d ? CHO[d[0]] : ch;
    })
    .join("");
}

/** 두벌식 기준 타수(키 입력 횟수) */
export function strokes(text: string): number {
  let n = 0;
  for (const ch of text) {
    const d = decompose(ch);
    if (!d) {
      n += 1;
      continue;
    }
    n += 1;
    n += COMPOUND_JUNG.has(d[1]) ? 2 : 1;
    if (d[2] !== 0) n += COMPOUND_JONG.has(d[2]) ? 2 : 1;
  }
  return n;
}

/** 끝말잇기에서 다음 단어가 시작할 수 있는 글자들 (두음법칙 포함) */
export function nextStarts(lastChar: string): string[] {
  const d = decompose(lastChar);
  if (!d) return [lastChar];
  const [cho, jung, jong] = d;
  const out = [lastChar];
  if (cho === CHO_R) {
    out.push(compose(Y_VOWELS.has(jung) ? CHO_IEUNG : CHO_N, jung, jong));
  } else if (cho === CHO_N && Y_VOWELS.has(jung)) {
    out.push(compose(CHO_IEUNG, jung, jong));
  }
  return out;
}

/** 정답 비교용: 공백 제거 + 소문자 */
export function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}
