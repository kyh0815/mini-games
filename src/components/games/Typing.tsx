"use client";

import { useEffect, useRef, useState } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { Countdown, LedTimer } from "@/components/arcade/timer";
import { Flag } from "@/components/icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { audio } from "@/lib/audio";
import { useNow } from "@/lib/clock";
import { strokes } from "@/lib/hangul";
import { useT } from "@/lib/i18n";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Lobby, Option, RankRow, Result, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "typing" }>;

const RACE_LIMIT_MS = 120_000;

/** 앞에서부터 맞게 친 글자 수 */
function correctPrefix(typed: string, target: string): number {
  let i = 0;
  while (i < typed.length && i < target.length && typed[i] === target[i]) i++;
  return i;
}

function Race({ view, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const t = useT();
  const now = useNow();
  const [typed, setTyped] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const started = now >= s.startAt && s.text !== "";
  const me = s.progress[view.you];
  const finished = me?.finishedMs != null;
  const correct = correctPrefix(typed, s.text);

  // 진행도는 글자마다 보내지 않고 일정 간격으로 묶어서 보냅니다.
  const latest = useRef({ correct, sent: 0 });
  useEffect(() => {
    latest.current.correct = correct;
  }, [correct]);
  useEffect(() => {
    if (!started || finished || !me) return;
    const id = setInterval(() => {
      const l = latest.current;
      if (l.correct !== l.sent) {
        l.sent = l.correct;
        send({ type: "progress", chars: l.correct });
      }
    }, 250);
    return () => clearInterval(id);
  }, [started, finished, me, send]);

  useEffect(() => {
    if (started) {
      audio.play("go");
      inputRef.current?.focus();
    }
  }, [started]);

  const onChange = (value: string) => {
    if (!started || finished) return;
    // 문장보다 길게는 입력되지 않게 막습니다.
    const next = value.replace(/\n/g, "").slice(0, s.text.length);
    setTyped(next);
    if (next === s.text) send({ type: "finish", typed: next });
  };

  const elapsedMin = Math.max(1, now - s.startAt) / 60_000;
  const speed = started ? Math.round(strokes(s.text.slice(0, correct)) / elapsedMin) : 0;
  const ranked = [...s.participants].sort((a, b) => s.progress[b].chars - s.progress[a].chars);
  const total = Math.max(1, s.text.length);

  return (
    <div className="flex flex-col gap-5">
      <Screen>
        {!started ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6">
            <Label11>GET READY</Label11>
            <Countdown until={s.startAt} />
            <p className="text-sm text-muted-foreground">{t("키보드에 손을 올리세요.")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex items-end justify-between gap-4">
              <span className="flex items-baseline gap-1.5 text-sm text-muted-foreground">
                <span className="font-pixel fs-2 text-foreground tabular-nums">{speed}</span>
                {t("타/분")}
              </span>
              <span className="font-pixel fs-15 text-muted-foreground tabular-nums">
                {Math.round((correct / total) * 100)}%
              </span>
            </div>

            {/* 문장 자체가 입력창입니다. 보이지 않는 textarea가 위에 덮여 키 입력을 받습니다. */}
            <div
              className={cn(
                "relative border-2 bg-card p-4 transition-colors sm:p-5",
                focused && !finished ? "border-foreground/70" : "border-border",
              )}
            >
              <p aria-hidden className="text-xl leading-10 font-medium break-all sm:text-2xl sm:leading-[2.75rem]">
                {Array.from(s.text).map((ch, i) => {
                  const state =
                    i < correct
                      ? "ok"
                      : i < typed.length - 1
                        ? "bad"
                        : // 한글은 조합 중인 마지막 글자가 잠깐 다를 수 있어 오타로 치지 않습니다.
                          i === typed.length - 1
                          ? "composing"
                          : "todo";
                  const caret = i === typed.length && focused && !finished;
                  return (
                    <span
                      key={i}
                      className={cn(
                        "relative",
                        state === "ok" && "text-pop-green",
                        state === "bad" && "bg-pop-red/25 text-pop-red",
                        state === "composing" && "bg-muted text-foreground",
                        state === "todo" && "text-muted-foreground/70",
                      )}
                    >
                      {caret && (
                        <span className="absolute top-[0.15em] -left-px h-[1.2em] w-0.5 animate-blink bg-foreground" />
                      )}
                      {ch === " " ? " " : ch}
                    </span>
                  );
                })}
              </p>
              {me && (
                <textarea
                  ref={inputRef}
                  value={typed}
                  onChange={(e) => onChange(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                  disabled={finished}
                  aria-label={t("다음 문장을 입력하세요: {text}", { text: s.text })}
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="absolute inset-0 size-full cursor-text resize-none bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent"
                />
              )}
              {me && !focused && !finished && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-card/90">
                  <span className="text-sm font-semibold">{t("여기를 눌러 입력을 시작하세요")}</span>
                </div>
              )}
            </div>

            {finished ? (
              <p className="text-center text-sm font-semibold text-pop-green">
                {t("완주! 다른 사람을 기다리는 중…")}
              </p>
            ) : !me ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("게임 도중에 들어와 이번 판은 관전합니다.")}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                {t("빨간 글자가 보이면 지우고 다시 입력하세요.")}
              </p>
            )}
            <LedTimer deadline={s.deadline} totalMs={RACE_LIMIT_MS} />
          </div>
        )}
      </Screen>

      <Panel label="RACE">
        <ul className="flex flex-col gap-3 p-4">
          {ranked.map((id) => {
            const p = s.progress[id];
            const ratio = started ? p.chars / total : 0;
            return (
              <li key={id} className="flex items-center gap-3">
                <span className="w-24 truncate text-sm font-medium sm:w-32">{nameOf(id)}</span>
                {/* 트랙: 캐릭터가 결승선까지 달립니다 */}
                <div className="relative h-8 flex-1 bg-inset">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 transition-[width] duration-300",
                      p.finishedMs != null ? "bg-pop-green/25" : "bg-muted",
                    )}
                    style={{ width: `${ratio * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-300"
                    style={{ left: `calc(${ratio} * (100% - 1.75rem))` }}
                  >
                    <PixelAvatar seed={id} className="size-7 border-0" />
                  </div>
                </div>
                <Flag
                  className={cn("size-5", p.finishedMs != null ? "text-pop-green" : "text-muted-foreground")}
                />
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

export function Typing(props: GameProps<View>) {
  const { view, send, nameOf } = props;
  const s = view.state;
  const t = useT();
  const [length, setLength] = useState("short");

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} send={send} onStart={() => send({ type: "start", length })}>
        <Option label={t("문장 길이")}>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label={t("문장 길이")}
            value={length}
            onValueChange={(v) => v && setLength(v)}
          >
            <ToggleGroupItem value="short">{t("짧은 글")}</ToggleGroupItem>
            <ToggleGroupItem value="long">{t("긴 글")}</ToggleGroupItem>
          </ToggleGroup>
        </Option>
      </Lobby>
    );
  }

  // 판마다 입력 상태를 새로 시작하도록 startAt을 key로 씁니다.
  if (s.phase === "race") return <Race key={s.startAt} {...props} />;

  const ranked = [...s.participants].sort((a, b) => {
    const pa = s.progress[a];
    const pb = s.progress[b];
    if (pa.finishedMs != null && pb.finishedMs != null) return pa.finishedMs - pb.finishedMs;
    if (pa.finishedMs != null) return -1;
    if (pb.finishedMs != null) return 1;
    return pb.chars - pa.chars;
  });
  const winner = ranked[0];
  const anyFinished = winner && s.progress[winner].finishedMs != null;
  const iPlayed = s.participants.includes(view.you);

  return (
    <Result
      view={view}
      send={send}
      tone={!anyFinished || !iPlayed ? "neutral" : winner === view.you ? "win" : "lose"}
      title={anyFinished ? t("{name} 우승", { name: nameOf(winner) }) : t("시간 종료")}
      subtitle={anyFinished ? undefined : t("아무도 완주하지 못했습니다.")}
    >
      <div className="flex flex-col gap-4">
        <ol className="flex flex-col gap-2">
          {ranked.map((id, i) => {
            const p = s.progress[id];
            return (
              <RankRow key={id} rank={i + 1} id={id} name={nameOf(id)} you={id === view.you}>
                {p.finishedMs != null ? (
                  <>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {t("{n}초", { n: (p.finishedMs / 1000).toFixed(1) })}
                    </span>
                    <span className="font-pixel w-20 text-right fs-15 text-foreground tabular-nums">
                      {t("{n}타", { n: Math.round(s.strokes / (p.finishedMs / 60_000)) })}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t("미완주 {n}%", { n: Math.round((p.chars / Math.max(1, s.text.length)) * 100) })}
                  </span>
                )}
              </RankRow>
            );
          })}
        </ol>
        <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">{s.text}</p>
      </div>
    </Result>
  );
}
