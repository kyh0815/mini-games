"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomView } from "@/lib/types";
import { Card, Field, Select, cx } from "../ui";
import { BackToLobby, Lobby, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "typing" }>;

/** 앞에서부터 맞게 친 글자 수 */
function correctPrefix(typed: string, target: string): number {
  let i = 0;
  while (i < typed.length && i < target.length && typed[i] === target[i]) i++;
  return i;
}

function Race({ view, now, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [typed, setTyped] = useState("");
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
    }, 300);
    return () => clearInterval(id);
  }, [started, finished, me, send]);

  useEffect(() => {
    if (started) inputRef.current?.focus();
  }, [started]);

  const onChange = (value: string) => {
    if (!started || finished) return;
    setTyped(value);
    if (value === s.text) send({ type: "finish", typed: value });
  };

  const ranked = [...s.participants].sort(
    (a, b) => s.progress[b].chars - s.progress[a].chars,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        {!started ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-sm text-zinc-500">곧 시작합니다</p>
            <p className="text-7xl font-bold tabular-nums">
              {Math.max(1, Math.ceil((s.startAt - now) / 1000))}
            </p>
          </div>
        ) : (
          <>
            <p className="text-lg leading-9 sm:text-xl" aria-label="입력할 문장">
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
                return (
                  <span
                    key={i}
                    className={cx(
                      state === "ok" && "text-emerald-600 dark:text-emerald-400",
                      state === "bad" && "rounded bg-rose-200 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
                      state === "composing" && "underline decoration-indigo-500 decoration-2 underline-offset-4",
                      state === "todo" && "text-zinc-400",
                    )}
                  >
                    {ch}
                  </span>
                );
              })}
            </p>
            {me ? (
              <textarea
                ref={inputRef}
                value={typed}
                onChange={(e) => onChange(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                onDrop={(e) => e.preventDefault()}
                disabled={finished}
                rows={3}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                placeholder="여기에 입력하세요"
                className="w-full resize-none rounded-lg border border-zinc-300 bg-transparent p-3 text-lg outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-zinc-700"
              />
            ) : (
              <p className="text-sm text-zinc-500">게임 도중에 들어와 이번 판은 관전합니다.</p>
            )}
            {finished && <p className="text-center font-medium">완주! 다른 사람을 기다리는 중…</p>}
          </>
        )}
      </Card>
      <Card>
        <ul className="flex flex-col gap-3">
          {ranked.map((id) => {
            const p = s.progress[id];
            const total = Math.max(1, s.text.length);
            return (
              <li key={id} className="flex items-center gap-3 text-sm">
                <span className="w-24 truncate">
                  {nameOf(id)}
                  {id === view.you && " (나)"}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className={cx(
                      "h-full rounded-full transition-[width] duration-300",
                      p.finishedMs != null ? "bg-emerald-500" : "bg-indigo-500",
                    )}
                    style={{ width: `${started ? (p.chars / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums text-zinc-500">
                  {p.finishedMs != null ? "완주" : `${started ? Math.round((p.chars / total) * 100) : 0}%`}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

export function Typing(props: GameProps<View>) {
  const { view, send, nameOf } = props;
  const s = view.state;
  const [length, setLength] = useState("short");

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} onStart={() => send({ type: "start", length })}>
        <Field label="문장 길이">
          <Select value={length} onChange={(e) => setLength(e.target.value)}>
            <option value="short">짧은 글</option>
            <option value="long">긴 글</option>
          </Select>
        </Field>
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

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="text-center text-2xl font-semibold">🏁 결과</h2>
      <ol className="flex flex-col gap-2">
        {ranked.map((id, i) => {
          const p = s.progress[id];
          const done = p.finishedMs != null;
          return (
            <li
              key={id}
              className="flex items-center gap-3 rounded-lg bg-zinc-100 px-4 py-3 text-sm dark:bg-zinc-800"
            >
              <span className="w-6 text-lg">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
              <span className="flex-1 truncate font-medium">
                {nameOf(id)}
                {id === view.you && " (나)"}
              </span>
              {done ? (
                <>
                  <span className="tabular-nums text-zinc-500">
                    {(p.finishedMs! / 1000).toFixed(1)}초
                  </span>
                  <span className="w-20 text-right font-medium tabular-nums">
                    {Math.round(s.strokes / (p.finishedMs! / 60_000))}타
                  </span>
                </>
              ) : (
                <span className="text-zinc-500">
                  미완주 ({Math.round((p.chars / Math.max(1, s.text.length)) * 100)}%)
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-sm text-zinc-500">{s.text}</p>
      <BackToLobby view={view} send={send} />
    </Card>
  );
}
