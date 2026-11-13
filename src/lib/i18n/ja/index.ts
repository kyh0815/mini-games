import { JA_COMMON } from "./common";
import { JA_DATA } from "./data";
import { JA_OTHERGAMES } from "./othergames";
import { JA_RELEASES } from "./releases";
import { JA_SHELL } from "./shell";
import { JA_WORDGAMES } from "./wordgames";

/** 한국어 원문 → 일본어. 화면 영역별 파일을 하나로 합칩니다. */
export const JA: Record<string, string> = {
  ...JA_DATA,
  ...JA_RELEASES,
  ...JA_SHELL,
  ...JA_WORDGAMES,
  ...JA_OTHERGAMES,
  ...JA_COMMON,
};
