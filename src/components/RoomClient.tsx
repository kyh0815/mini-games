"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Blink, Panel } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { Check, Copy, Crown, InfoBox, Logout } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { audio } from "@/lib/audio";
import { post, saveName, savedName } from "@/lib/client";
import { getGame } from "@/lib/games";
import type { GameAction, RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Chosung } from "./games/Chosung";
import { Liar } from "./games/Liar";
import { Rules } from "./games/shared";
import { Typing } from "./games/Typing";
import { WordChain } from "./games/WordChain";
import { roomSfx } from "./games/sfx";

type Status = "checking" | "needName" | "joined" | "notFound" | "left";

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <Panel className="mx-auto mt-10 w-full max-w-md">
      <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <h1 className="font-pixel fs-2 text-neon-red neon-text">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
        <Button asChild variant="coin">
          <Link href="/">오락실로 돌아가기</Link>
        </Button>
      </div>
    </Panel>
  );
}

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [view, setView] = useState<RoomView | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(0);
  const [connected, setConnected] = useState(true);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const prevView = useRef<RoomView | null>(null);

  const join = useCallback(
    async (name?: string) => {
      try {
        // 이미 참가한 방이면 쿠키만으로 복귀합니다. 이름은 처음 들어올 때만 필요합니다.
        const res = await post<{ joined: boolean }>(`/api/rooms/${code}/join`, { name });
        setStatus(res.joined ? "joined" : "needName");
      } catch (err) {
        if ((err as { status?: number }).status === 404) setStatus("notFound");
        else {
          setStatus("needName");
          toast.error((err as Error).message);
        }
      }
    },
    [code],
  );

  useEffect(() => {
    const id = setTimeout(() => join(), 0);
    return () => clearTimeout(id);
  }, [join]);

  useEffect(() => {
    if (status === "needName" && nameRef.current && !nameRef.current.value) {
      nameRef.current.value = savedName();
    }
  }, [status]);

  useEffect(() => {
    if (status !== "joined") return;
    const source = new EventSource(`/api/rooms/${code}/events`);
    source.onopen = () => setConnected(true);
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as RoomView;
      setOffset(next.serverNow - Date.now());
      setView(next);
    };
    // 스스로 나갔거나 방장이 내보낸 경우
    source.addEventListener("gone", () => {
      source.close();
      setView(null);
      setStatus("left");
    });
    source.onerror = () => {
      setConnected(false);
      // 서버가 재시작되어 방이 사라지면 브라우저가 재연결을 포기합니다.
      if (source.readyState === EventSource.CLOSED) {
        setView(null);
        setStatus("checking");
        join();
      }
    };
    return () => source.close();
  }, [code, status, join]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 100);
    return () => clearInterval(id);
  }, [offset]);

  // 상태 변화에 맞춰 효과음과 BGM 빠르기를 바꿉니다.
  useEffect(() => {
    if (!view) return;
    roomSfx(prevView.current, view);
    audio.setMood(view.state.phase === "lobby" || view.state.phase === "result" ? "lobby" : "play");
    prevView.current = view;
  }, [view]);
  useEffect(() => () => audio.setMood("lobby"), []);

  const send = useCallback(
    async (action: GameAction) => {
      try {
        await post(`/api/rooms/${code}/action`, { action });
        return true;
      } catch (err) {
        audio.play("wrong");
        toast.error((err as Error).message);
        return false;
      }
    },
    [code],
  );

  const nameOf = useCallback(
    (id: string | null | undefined) =>
      view?.players.find((p) => p.id === id)?.name ?? "나간 사람",
    [view],
  );

  if (status === "notFound") {
    return <Notice title="ROOM NOT FOUND">코드가 틀렸거나, 오래 비어 있어 방이 닫혔습니다.</Notice>;
  }
  if (status === "left") {
    return <Notice title="SEE YOU AGAIN">방에서 나왔습니다.</Notice>;
  }

  if (status === "needName") {
    const submit = async (e: FormEvent) => {
      e.preventDefault();
      const name = nameRef.current?.value.trim() ?? "";
      if (!name) return nameRef.current?.focus();
      saveName(name);
      setJoining(true);
      await join(name);
      setJoining(false);
    };
    return (
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>PLAYER ENTRY</DialogTitle>
            <DialogDescription>
              방 <span className="font-pixel text-neon-yellow">{code}</span>에 입장합니다. 게임에서 쓸
              이름을 정해 주세요.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input
              ref={nameRef}
              aria-label="이름"
              placeholder="이름 (1~12자)"
              maxLength={12}
              autoComplete="off"
              autoFocus
            />
            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">취소</Link>
              </Button>
              <Button type="submit" variant="coin" disabled={joining} className="flex-1">
                입장
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (!view) {
    return (
      <p className="py-32 text-center">
        <Blink className="fs-2 text-neon-cyan">NOW LOADING…</Blink>
      </p>
    );
  }

  const game = getGame(view.game)!;
  const inLobby = view.state.phase === "lobby";
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("초대 링크를 복사했습니다.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("복사하지 못했습니다. 주소창의 주소를 직접 복사해 주세요.");
    }
  };
  const leave = async () => {
    await send({ type: "leave" });
    router.push("/");
  };
  const props = { now, send, nameOf };

  return (
    <div data-game={view.game} className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="방 나가기">
                    <Logout className="rotate-180" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>방 나가기</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>방에서 나갈까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  {inLobby
                    ? "초대 링크로 언제든 다시 들어올 수 있습니다."
                    : "게임이 진행 중입니다. 나가면 이번 판에는 다시 참여할 수 없습니다."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button variant="outline">계속 하기</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={leave}>
                    나가기
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <h1 className="font-pixel animate-flicker fs-2 text-game neon-text sm:fs-3">
            {game.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-11 items-center gap-2 border-2 border-ink bg-ink px-3">
            <span className="font-pixel fs-1 text-muted-foreground">ROOM</span>
            <span className="font-pixel fs-2 tracking-[0.2em] text-neon-yellow neon-text">
              {view.code}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="coin" size="icon" aria-label="초대 링크 복사" onClick={copyLink}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>초대 링크 복사</TooltipContent>
          </Tooltip>
          <Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="게임 방법">
                    <InfoBox />
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>게임 방법</TooltipContent>
            </Tooltip>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>HOW TO PLAY</DialogTitle>
                <DialogDescription>
                  {game.title} · {game.players}
                </DialogDescription>
              </DialogHeader>
              <Rules rules={game.rules} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {!connected && (
        <p
          role="status"
          className="font-pixel border-2 border-neon-yellow bg-ink/70 px-3 py-2 text-center fs-1 text-neon-yellow"
        >
          CONNECTION LOST · 다시 연결하는 중…
        </p>
      )}

      {!inLobby && (
        <ul className="flex flex-wrap gap-2" aria-label="참가자">
          {view.players.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex items-center gap-2 border-2 bg-ink/60 py-1 pr-2.5 pl-1 text-sm",
                p.id === view.you ? "border-game" : "border-border",
                !p.online && "opacity-45",
              )}
            >
              <PixelAvatar seed={p.id} className="size-6 border-0" />
              <span className="max-w-28 truncate">{p.name}</span>
              {p.id === view.hostId && <Crown aria-label="방장" className="size-4 text-neon-yellow" />}
              {!p.online && <span className="text-xs text-muted-foreground">끊김</span>}
            </li>
          ))}
        </ul>
      )}

      {view.game === "chosung" && <Chosung view={view} {...props} />}
      {view.game === "liar" && <Liar view={view} {...props} />}
      {view.game === "typing" && <Typing view={view} {...props} />}
      {view.game === "wordchain" && <WordChain view={view} {...props} />}
    </div>
  );
}
