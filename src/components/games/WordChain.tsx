"use client";

import { useState, type FormEvent } from "react";
import type { RoomView } from "@/lib/types";
import { Button, Card, Field, Input, Select, TimeBar, cx } from "../ui";
import { BackToLobby, Lobby, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "wordchain" }>;

export function WordChain({ view, now, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const [turnSeconds, setTurnSeconds] = useState(15);
  const [text, setText] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby view={view} onStart={() => send({ type: "start", turnSeconds })}>
        <Field label="제한 시간">
          <Select value={turnSeconds} onChange={(e) => setTurnSeconds(Number(e.target.value))}>
            {[10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}초
              </option>
            ))}
          </Select>
        </Field>
      </Lobby>
    );
  }

  const players = (
    <ul className="flex flex-wrap gap-2">
      {s.order.map((id) => {
        const out = s.lives[id] <= 0;
        return (
          <li
            key={id}
            className={cx(
              "flex flex-col rounded-lg border px-3 py-2 text-sm",
              s.turnId === id
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                : "border-zinc-200 dark:border-zinc-800",
              out && "opacity-40",
            )}
          >
            <span className="max-w-28 truncate font-medium">
              {nameOf(id)}
              {id === view.you && " (나)"}
            </span>
            <span className="text-xs" aria-label={`목숨 ${Math.max(0, s.lives[id])}개`}>
              {out ? "탈락" : "❤️".repeat(s.lives[id]) + "🤍".repeat(s.maxLives - s.lives[id])}
            </span>
          </li>
        );
      })}
    </ul>
  );

  if (s.phase === "result") {
    return (
      <Card className="flex flex-col items-center gap-5 text-center">
        <p className="text-2xl font-semibold">
          {s.winnerId ? `🏆 ${nameOf(s.winnerId)} 우승!` : "승자 없이 끝났습니다"}
        </p>
        {players}
        <BackToLobby view={view} send={send} />
      </Card>
    );
  }

  const myTurn = s.turnId === view.you;
  const last = s.chain[s.chain.length - 1];
  const canObject =
    !!last && s.starts !== null && last.playerId !== view.you && s.lives[view.you] > 0;
  const objected = s.objections.includes(view.you);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (await send({ type: "word", text })) setText("");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        {players}
        {s.lastEvent && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {s.lastEvent.type === "timeout"
              ? `⏰ ${nameOf(s.lastEvent.playerId)} 님이 시간 초과로 목숨을 잃었습니다.`
              : `🙅 '${s.lastEvent.word}'은(는) 무효가 되어 ${nameOf(s.lastEvent.playerId)} 님이 목숨을 잃었습니다.`}
          </p>
        )}
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          {s.starts && last ? (
            <>
              <p className="text-4xl font-bold sm:text-5xl">
                {last.word.slice(0, -1)}
                <span className="text-indigo-600 dark:text-indigo-400">{last.word.slice(-1)}</span>
              </p>
              <p className="text-sm text-zinc-500">
                {nameOf(last.playerId)} · 다음 단어는 &lsquo;{s.starts.join("’ 또는 ‘")}&rsquo;(으)로 시작
              </p>
            </>
          ) : (
            <p className="text-xl text-zinc-500">아무 단어로나 시작하세요</p>
          )}
        </div>
        <TimeBar now={now} deadline={s.deadline} totalMs={s.turnSeconds * 1000} />
        {myTurn ? (
          <form onSubmit={submit} className="flex gap-2">
            <Input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="내 차례! 단어 입력"
              maxLength={10}
              autoComplete="off"
            />
            <Button type="submit">제출</Button>
          </form>
        ) : (
          <p className="text-center text-sm text-zinc-500">{nameOf(s.turnId)} 님의 차례입니다.</p>
        )}
        {canObject && (
          <Button variant="ghost" disabled={objected} onClick={() => send({ type: "object" })}>
            {objected ? "이의 제기함" : `'${last.word}' 이의 제기`} ({s.objections.length}/
            {s.objectionsNeeded})
          </Button>
        )}
      </Card>
      {s.chain.length > 1 && (
        <Card>
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
            {s.chain.map((entry, i) => (
              <li key={`${entry.word}-${i}`}>
                {i > 0 && <span className="mr-2">→</span>}
                {entry.word}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
