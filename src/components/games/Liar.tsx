"use client";

import { useState, type FormEvent } from "react";
import type { RoomView } from "@/lib/types";
import { Button, Card, Field, Input, Select, TimeBar, cx } from "../ui";
import { BackToLobby, Lobby, type GameProps } from "./shared";

type View = Extract<RoomView, { game: "liar" }>;

export function Liar({ view, now, send, nameOf }: GameProps<View>) {
  const s = view.state;
  const isHost = view.hostId === view.you;
  const [category, setCategory] = useState("random");
  const [shown, setShown] = useState(false);
  const [guess, setGuess] = useState("");

  if (s.phase === "lobby") {
    return (
      <Lobby
        view={view}
        onStart={() => {
          setShown(false);
          setGuess("");
          send({ type: "start", category });
        }}
      >
        <Field label="주제">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="random">랜덤</option>
            {s.categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </Lobby>
    );
  }

  const topic = (
    <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
      주제: {s.category}
    </span>
  );

  // 옆자리에서 화면이 보일 수 있어, 눌렀을 때만 자기 카드가 보이게 합니다.
  const myCard = s.youPlaying ? (
    <button
      type="button"
      onClick={() => setShown((v) => !v)}
      className="flex min-h-32 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 p-4 dark:border-zinc-700"
    >
      {shown ? (
        s.youAreLiar ? (
          <>
            <span className="text-2xl font-bold text-rose-600">당신은 라이어입니다</span>
            <span className="text-sm text-zinc-500">제시어를 아는 척 둘러대세요</span>
          </>
        ) : (
          <>
            <span className="text-sm text-zinc-500">제시어</span>
            <span className="text-3xl font-bold">{s.word}</span>
          </>
        )
      ) : (
        <span className="text-zinc-500">눌러서 내 카드 확인 (다시 누르면 가려집니다)</span>
      )}
    </button>
  ) : (
    <p className="rounded-xl bg-zinc-100 p-4 text-center text-sm text-zinc-500 dark:bg-zinc-800">
      게임 도중에 들어와 이번 판은 관전합니다.
    </p>
  );

  if (s.phase === "discuss") {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">설명 시간</h2>
          {topic}
        </div>
        {myCard}
        <div>
          <p className="mb-2 text-sm text-zinc-500">아래 순서대로 제시어를 한마디씩 설명하세요.</p>
          <ol className="flex flex-wrap gap-2 text-sm">
            {s.order.map((id, i) => (
              <li key={id} className="rounded-lg bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800">
                {i + 1}. {nameOf(id)}
              </li>
            ))}
          </ol>
        </div>
        {isHost ? (
          <Button onClick={() => send({ type: "startVote" })}>투표 시작</Button>
        ) : (
          <p className="text-sm text-zinc-500">설명이 끝나면 방장이 투표를 시작합니다.</p>
        )}
      </Card>
    );
  }

  if (s.phase === "vote") {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">라이어는 누구일까요?</h2>
          {topic}
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {s.participants.map((id) => {
            const mine = s.yourVote === id;
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={!s.youPlaying || id === view.you}
                  onClick={() => send({ type: "vote", target: id })}
                  className={cx(
                    "flex h-12 w-full items-center justify-between rounded-lg border px-4 text-left transition-colors disabled:opacity-50",
                    mine
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800",
                  )}
                >
                  <span className="truncate">
                    {nameOf(id)}
                    {id === view.you && " (나)"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {mine ? "내가 지목" : s.voted.includes(id) ? "투표 완료" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-zinc-500">
          {s.voted.length} / {s.participants.length}명 투표 · 마감 전에는 바꿀 수 있습니다
        </p>
        {isHost && (
          <Button variant="ghost" onClick={() => send({ type: "closeVote" })}>
            지금 투표 마감
          </Button>
        )}
      </Card>
    );
  }

  if (s.phase === "guess") {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (guess.trim()) send({ type: "guess", text: guess });
    };
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">라이어 적발!</h2>
          {topic}
        </div>
        <p className="text-center text-xl">
          라이어는 <b>{nameOf(s.liarId)}</b> 님이었습니다.
        </p>
        <TimeBar now={now} deadline={s.deadline} totalMs={30_000} />
        {s.youAreLiar ? (
          <form onSubmit={submit} className="flex flex-col gap-2">
            <p className="text-sm text-zinc-500">제시어를 맞히면 역전승입니다. 기회는 한 번뿐입니다.</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="제시어는?"
                maxLength={20}
                autoComplete="off"
              />
              <Button type="submit">제출</Button>
            </div>
          </form>
        ) : (
          <p className="text-center text-sm text-zinc-500">
            라이어가 제시어를 맞히면 라이어가 역전합니다. 기다려 주세요.
          </p>
        )}
      </Card>
    );
  }

  const liarWon = s.winner === "liar";
  const caught = s.accusedId === s.liarId;
  return (
    <Card className="flex flex-col gap-5">
      <div className="text-center">
        <p className="text-2xl font-semibold">{liarWon ? "🤥 라이어 승리!" : "🎉 시민 승리!"}</p>
        <p className="mt-1 text-sm text-zinc-500">
          {!caught
            ? "라이어를 찾아내지 못했습니다."
            : liarWon
              ? "라이어가 제시어를 맞혀 역전했습니다."
              : s.liarGuess
                ? "라이어가 제시어를 맞히지 못했습니다."
                : "라이어가 시간 안에 답하지 못했습니다."}
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-zinc-500">라이어</dt>
        <dd className="font-medium">{nameOf(s.liarId)}</dd>
        <dt className="text-zinc-500">제시어</dt>
        <dd className="font-medium">
          {s.word} ({s.category})
        </dd>
        {s.liarGuess && (
          <>
            <dt className="text-zinc-500">라이어의 답</dt>
            <dd className="font-medium">{s.liarGuess}</dd>
          </>
        )}
      </dl>
      <div>
        <h3 className="mb-2 text-sm text-zinc-500">투표 결과</h3>
        <ul className="flex flex-col gap-1 text-sm">
          {s.participants.map((id) => (
            <li key={id}>
              {nameOf(id)} → {s.votes?.[id] ? nameOf(s.votes[id]) : "기권"}
            </li>
          ))}
        </ul>
      </div>
      <BackToLobby view={view} send={send} />
    </Card>
  );
}
