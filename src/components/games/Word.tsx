"use client";

import { useCallback, useEffect, useState } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { LedTimer } from "@/components/arcade/timer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { audio } from "@/lib/audio";
import { rich, useT } from "@/lib/i18n";
import type { Mark, RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "word" }>;

const ROWS = ["ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"];
/** 한글 입력기가 켜져 있어도 누른 자리 그대로 받도록, 글자가 아니라 키 위치로 읽습니다. */
const CODE_TO_KEY: Record<string, string> = {
  KeyQ: "ㅂ", KeyW: "ㅈ", KeyE: "ㄷ", KeyR: "ㄱ", KeyT: "ㅅ", KeyY: "ㅛ", KeyU: "ㅕ", KeyI: "ㅑ", KeyO: "ㅐ", KeyP: "ㅔ",
  KeyA: "ㅁ", KeyS: "ㄴ", KeyD: "ㅇ", KeyF: "ㄹ", KeyG: "ㅎ", KeyH: "ㅗ", KeyJ: "ㅓ", KeyK: "ㅏ", KeyL: "ㅣ",
  KeyZ: "ㅋ", KeyX: "ㅌ", KeyC: "ㅊ", KeyV: "ㅍ", KeyB: "ㅠ", KeyN: "ㅜ", KeyM: "ㅡ",
};

const MARK_CLASS: Record<Mark, string> = {
  hit: "border-pop-green bg-pop-green text-ink",
  near: "border-pop-yellow bg-pop-yellow text-ink",
  miss: "border-muted bg-muted text-muted-foreground",
};
const RANK: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };

export function Word({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const [length, setLength] = useState("5");
  const [draft, setDraft] = useState<string[]>([]);
  const mine = s.boards[view.you];
  const canType = s.phase === "play" && !!mine && !mine.done;

  const press = useCallback(
    async (key: string) => {
      if (!canType) return;
      if (key === "enter") {
        if (draft.length !== s.length) return;
        const keys = draft;
        setDraft([]);
        if (!(await send({ type: "guess", keys }))) setDraft(keys);
      } else if (key === "back") {
        setDraft((d) => d.slice(0, -1));
      } else {
        setDraft((d) => (d.length < s.length ? [...d, key] : d));
        audio.play("click");
      }
    },
    [canType, draft, s.length, send],
  );

  useEffect(() => {
    if (!canType) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.code === "Enter" ? "enter" : e.code === "Backspace" ? "back" : CODE_TO_KEY[e.code];
      if (!key) return;
      e.preventDefault();
      void press(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canType, press]);

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} send={send} onStart={() => send({ type: "start", length: Number(length) })}>
        <Option label={t("칸 수")}>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t("칸 수")}
            value={length}
            onValueChange={(v) => v && setLength(v)}
          >
            <ToggleGroupItem value="5">{t("5칸")}</ToggleGroupItem>
            <ToggleGroupItem value="6">{t("6칸")}</ToggleGroupItem>
          </ToggleGroup>
        </Option>
      </Lobby>
    );
  }

  /** 줄 수가 적을수록, 같으면 빨리 푼 사람이 위 */
  const ranked = [...s.participants].sort((a, b) => {
    const x = s.boards[a];
    const y = s.boards[b];
    if ((x.solvedMs === null) !== (y.solvedMs === null)) return x.solvedMs === null ? 1 : -1;
    if (x.solvedMs === null || y.solvedMs === null) return 0;
    return x.rows.length - y.rows.length || x.solvedMs - y.solvedMs;
  });

  if (s.phase === "result") {
    const winner = ranked[0];
    const solved = winner && s.boards[winner].solvedMs !== null;
    const iPlayed = s.participants.includes(view.you);
    return (
      <Result
        view={view}
        send={send}
        tone={!solved || !iPlayed ? "neutral" : winner === view.you ? "win" : "lose"}
        title={solved ? t("{name} 우승", { name: nameOf(winner) }) : t("아무도 못 맞혔습니다")}
        subtitle={
          rich(t("정답은 <b>{answer}</b>", { answer: s.answer ?? "" }), {
            b: (chunk) => <b className="font-semibold text-foreground">{chunk}</b>,
          })
        }
      >
        <ol className="flex flex-col gap-2">
          {ranked.map((id, i) => {
            const b = s.boards[id];
            return (
              <RankRow key={id} rank={i + 1} id={id} name={nameOf(id)} you={id === view.you}>
                {b.solvedMs !== null ? (
                  <>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {t("{n}초", { n: (b.solvedMs / 1000).toFixed(1) })}
                    </span>
                    <span className="font-pixel w-14 text-right fs-15 tabular-nums">{t("{n}번", { n: b.rows.length })}</span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("실패")}</span>
                )}
              </RankRow>
            );
          })}
        </ol>
      </Result>
    );
  }

  // 글쇠마다 지금까지 알아낸 가장 좋은 판정을 자판에 표시합니다.
  const known = new Map<string, Mark>();
  for (const row of mine?.rows ?? []) {
    row.keys?.forEach((key, i) => {
      const prev = known.get(key);
      if (!prev || RANK[row.marks[i]] > RANK[prev]) known.set(key, row.marks[i]);
    });
  }
  const rows = mine?.rows ?? [];
  const grid = Array.from({ length: s.maxTries }, (_, r) => {
    if (r < rows.length) return { keys: rows[r].keys ?? [], marks: rows[r].marks as Mark[] | null };
    if (r === rows.length && canType) return { keys: draft, marks: null };
    return { keys: [] as string[], marks: null };
  });

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <Screen>
        <div className="flex flex-col items-center gap-5 p-4 sm:p-6">
          <div className="w-full">
            <LedTimer deadline={s.deadline} totalMs={s.totalMs} />
          </div>
          <div className="flex flex-col gap-1.5" role="grid" aria-label={t("내 판")}>
            {grid.map((row, r) => (
              <div key={r} role="row" className="flex gap-1.5">
                {Array.from({ length: s.length }, (_, c) => {
                  const key = row.keys[c];
                  const mark = row.marks?.[c];
                  return (
                    <span
                      key={c}
                      role="gridcell"
                      className={cn(
                        "flex size-11 items-center justify-center border-2 text-xl font-semibold sm:size-12",
                        mark
                          ? MARK_CLASS[mark]
                          : key
                            ? "border-foreground/70 bg-card"
                            : "border-border bg-card",
                      )}
                    >
                      {key}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          {mine?.done ? (
            <p className="text-sm">
              {/* 어순이 달라질 수 있어 한 문장으로 옮깁니다. */}
              {rich(
                mine.solvedMs !== null
                  ? t("<ok>맞혔습니다!</ok> 정답은 <b>{answer}</b>. 다른 사람을 기다리는 중…", { answer: s.answer ?? "" })
                  : t("<no>기회를 다 썼습니다.</no> 정답은 <b>{answer}</b>. 다른 사람을 기다리는 중…", { answer: s.answer ?? "" }),
                {
                  ok: (chunk) => <span className="font-semibold text-pop-green">{chunk}</span>,
                  no: (chunk) => <span className="font-semibold text-pop-red">{chunk}</span>,
                  b: (chunk) => <b className="font-semibold">{chunk}</b>,
                },
              )}
            </p>
          ) : !mine ? (
            <p className="text-sm text-muted-foreground">{t("게임 도중에 들어와 이번 판은 관전합니다.")}</p>
          ) : (
            <div className="flex w-full max-w-lg flex-col items-center gap-1.5" aria-label={t("자판")}>
              {ROWS.map((row, r) => (
                <div key={row} className="flex w-full justify-center gap-1">
                  {r === 2 && (
                    <button
                      type="button"
                      onClick={() => press("enter")}
                      disabled={draft.length !== s.length}
                      className="h-11 flex-[1.6] border-2 border-ink bg-game text-xs font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    >
                      {t("입력")}
                    </button>
                  )}
                  {Array.from(row).map((key) => {
                    const mark = known.get(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => press(key)}
                        className={cn(
                          "h-11 min-w-0 flex-1 border-2 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          mark ? MARK_CLASS[mark] : "border-ink bg-secondary hover:bg-accent",
                        )}
                      >
                        {key}
                      </button>
                    );
                  })}
                  {r === 2 && (
                    <button
                      type="button"
                      onClick={() => press("back")}
                      aria-label={t("지우기")}
                      className="h-11 flex-[1.6] border-2 border-ink bg-secondary text-xs font-semibold outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t("지움")}
                    </button>
                  )}
                </div>
              ))}
              <p className="mt-1 text-xs text-muted-foreground">
                {t("키보드로도 칠 수 있습니다. 쌍자음·겹모음은 나눠서 입력하세요.")}
              </p>
            </div>
          )}
        </div>
      </Screen>

      <Panel label="PLAYERS">
        <ul className="flex flex-col gap-3 p-3">
          {s.participants.map((id) => {
            const b = s.boards[id];
            return (
              <li key={id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">
                    {nameOf(id)}
                    {id === view.you && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">{t("나")}</span>
                    )}
                  </span>
                  <Label11>
                    {b.solvedMs !== null ? "CLEAR" : b.done ? "FAIL" : `${b.rows.length}/${s.maxTries}`}
                  </Label11>
                </div>
                {/* 남의 판은 색만 보입니다 */}
                <div className="flex flex-col gap-0.5">
                  {b.rows.map((row, r) => (
                    <div key={r} className="flex gap-0.5">
                      {row.marks.map((m, c) => (
                        <span key={c} className={cn("h-2.5 flex-1", MARK_CLASS[m].split(" ")[1])} />
                      ))}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
