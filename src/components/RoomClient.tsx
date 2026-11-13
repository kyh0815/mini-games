"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { getGame } from "@/lib/games";
import { post, saveName, saveToken, savedName, savedToken } from "@/lib/client";
import type { GameAction, RoomView } from "@/lib/types";
import { Chosung } from "./games/Chosung";
import { Liar } from "./games/Liar";
import { Typing } from "./games/Typing";
import { WordChain } from "./games/WordChain";
import { Button, Card, Input, cx } from "./ui";

type Status = "checking" | "needName" | "joined" | "notFound";

export function RoomClient({ code }: { code: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(0);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((message: string) => {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 3500);
  }, []);

  const join = useCallback(
    async (name?: string) => {
      try {
        const res = await post<{ token?: string; needName?: boolean }>(
          `/api/rooms/${code}/join`,
          { token: savedToken(code) ?? undefined, name },
        );
        if (res.token) {
          saveToken(code, res.token);
          setToken(res.token);
          setStatus("joined");
        } else {
          setStatus("needName");
        }
      } catch (err) {
        if ((err as { status?: number }).status === 404) setStatus("notFound");
        else {
          setStatus("needName");
          showError((err as Error).message);
        }
      }
    },
    [code, showError],
  );

  useEffect(() => {
    // 저장된 토큰이 있으면 이름을 다시 묻지 않고 바로 복귀합니다.
    const id = setTimeout(() => join(), 0);
    return () => clearTimeout(id);
  }, [join]);

  useEffect(() => {
    if (status === "needName" && nameRef.current && !nameRef.current.value) {
      nameRef.current.value = savedName();
    }
  }, [status]);

  useEffect(() => {
    if (!token) return;
    const source = new EventSource(`/api/rooms/${code}/events?token=${token}`);
    source.onopen = () => setConnected(true);
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as RoomView;
      setOffset(next.serverNow - Date.now());
      setView(next);
    };
    source.onerror = () => {
      setConnected(false);
      // 서버가 재시작되어 방이 사라진 경우 브라우저가 재연결을 포기합니다.
      if (source.readyState === EventSource.CLOSED) {
        setToken(null);
        setView(null);
        join();
      }
    };
    return () => source.close();
  }, [code, token, join]);

  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [offset]);

  const send = useCallback(
    async (action: GameAction) => {
      try {
        await post(`/api/rooms/${code}/action`, { token, action });
        return true;
      } catch (err) {
        showError((err as Error).message);
        return false;
      }
    },
    [code, token, showError],
  );

  const nameOf = useCallback(
    (id: string | null | undefined) =>
      view?.players.find((p) => p.id === id)?.name ?? "나간 사람",
    [view],
  );

  if (status === "notFound") {
    return (
      <Card className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-medium">방을 찾을 수 없습니다</p>
        <p className="text-sm text-zinc-500">
          코드가 틀렸거나, 오래 비어 있어 방이 닫혔습니다.
        </p>
        <Link href="/" className="text-indigo-600 underline dark:text-indigo-400">
          홈으로
        </Link>
      </Card>
    );
  }

  if (status === "needName") {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const name = nameRef.current?.value.trim() ?? "";
      if (!name) return;
      saveName(name);
      join(name);
    };
    return (
      <Card className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-lg font-medium">
          방 <span className="font-mono tracking-widest">{code}</span> 입장
        </h1>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input ref={nameRef} placeholder="이름 (1~12자)" maxLength={12} autoFocus />
          <Button type="submit">입장</Button>
        </form>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </Card>
    );
  }

  if (!view) {
    return <p className="py-20 text-center text-zinc-500">접속 중…</p>;
  }

  const game = getGame(view.game)!;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      showError("복사하지 못했습니다. 주소창의 주소를 직접 복사해 주세요.");
    }
  };
  const props = { now, send, nameOf };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-zinc-500 hover:underline">
            ← 홈
          </Link>
          <h1 className="text-xl font-semibold">
            {game.emoji} {game.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-zinc-100 px-3 py-2 font-mono text-lg tracking-widest dark:bg-zinc-800">
            {view.code}
          </span>
          <Button variant="ghost" onClick={copyLink}>
            {copied ? "복사됨!" : "초대 링크 복사"}
          </Button>
        </div>
      </header>

      <ul className="flex flex-wrap gap-2 text-sm">
        {view.players.map((p) => (
          <li
            key={p.id}
            className={cx(
              "rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800",
              !p.online && "opacity-40",
            )}
          >
            {p.id === view.hostId && "👑 "}
            {p.name}
            {p.id === view.you && " (나)"}
            {!p.online && " · 끊김"}
          </li>
        ))}
      </ul>

      {!connected && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          연결이 끊겼습니다. 다시 연결하는 중…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </p>
      )}

      {view.game === "chosung" && <Chosung view={view} {...props} />}
      {view.game === "liar" && <Liar view={view} {...props} />}
      {view.game === "typing" && <Typing view={view} {...props} />}
      {view.game === "wordchain" && <WordChain view={view} {...props} />}
    </div>
  );
}
