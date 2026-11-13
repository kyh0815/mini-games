"use client";

import { createElement, Fragment, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { JA } from "./ja";
import { JA_PATTERNS } from "./patterns";

/**
 * 화면 언어. 원문은 한국어이고, 한국어 문장을 그대로 열쇠로 써서 번역을 찾습니다.
 * 번역이 없는 문장은 한국어로 보입니다. 언어는 사람마다 따로 고르며 서버는 관여하지 않으므로,
 * 서로 다른 언어를 쓰는 사람이 같은 방에서 함께 할 수 있습니다.
 */
export type Lang = "ko" | "ja";
export const LANGS: { value: Lang; label: string }[] = [
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
];

const KEY = "mg_lang";
let lang: Lang | null = null;
const listeners = new Set<() => void>();

function current(): Lang {
  if (lang === null) {
    lang = "ko";
    try {
      if (localStorage.getItem(KEY) === "ja") lang = "ja";
    } catch {
      // 저장소를 쓸 수 없으면 한국어로 둡니다.
    }
  }
  return lang;
}

export function setLang(next: Lang): void {
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // 저장하지 못해도 이번 방문 동안은 유지됩니다.
  }
  document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, current, () => "ko");
}

export type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/** 문장을 해당 언어로 옮깁니다. {이름} 자리는 vars의 값으로 채웁니다. */
export function translate(to: Lang, text: string, vars?: Vars): string {
  if (to === "ko") return fill(text, vars);
  const hit = JA[text];
  if (hit !== undefined) return fill(hit, vars);
  // 서버가 값을 넣어 만든 문장(오류 안내 등)은 모양으로 찾습니다.
  for (const [pattern, render] of JA_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return fill(render(match), vars);
  }
  return fill(text, vars);
}

export type T = (text: string, vars?: Vars) => string;

export function useT(): T {
  const to = useLang();
  return useCallback((text: string, vars?: Vars) => translate(to, text, vars), [to]);
}

/** 컴포넌트 밖(알림 등)에서 지금 언어로 옮길 때 씁니다. */
export function tNow(text: string, vars?: Vars): string {
  return translate(current(), text, vars);
}

/**
 * 번역된 문장 안의 <b>…</b> 같은 표시를 요소로 바꿉니다.
 * 어순이 달라도 강조할 부분을 문장 안에서 옮길 수 있습니다.
 */
export function rich(text: string, tags: Record<string, (chunk: string) => ReactNode>): ReactNode {
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const render = tags[match[1]];
    parts.push(render ? render(match[2]) : match[2]);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return createElement(Fragment, null, ...parts);
}
