"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { GameIcon } from "@/components/arcade/game-icon";
import { openNickname } from "@/components/arcade/nickname";
import { Blink, Panel } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { ArrowLeft, Check, Crown, InfoBox, LinkIcon } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { audio } from "@/lib/audio";
import { post } from "@/lib/client";
import { syncClock } from "@/lib/clock";
import { drawStore } from "@/lib/draw-store";
import { getGame } from "@/lib/games";
import { useLobby } from "@/lib/lobby-store";
import type { GameAction, RoomView, Stroke } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Aim } from "./games/Aim";
import { Baseball } from "./games/Baseball";
import { Chosung } from "./games/Chosung";
import { Draw } from "./games/Draw";
import { Liar } from "./games/Liar";
import { Memory } from "./games/Memory";
import { Reaction } from "./games/Reaction";
import { Rules } from "./games/shared";
import { Snake } from "./games/Snake";
import { Stairs } from "./games/Stairs";
import { Typing } from "./games/Typing";
import { Word } from "./games/Word";
import { WordChain } from "./games/WordChain";
import { roomSfx } from "./games/sfx";

type Status =
  | { kind: "joining" }
  | { kind: "joined" }
  | { kind: "notFound" }
  | { kind: "left" }
  | { kind: "refused"; message: string };

function Notice({ title, children, action }: { title: string; children: string; action?: ReactNode }) {
  return (
    <Panel className="mx-auto mt-10 w-full max-w-md">
      <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <h1 className="font-pixel fs-2 text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{children}</p>
        <div className="flex gap-3">
          {action}
          <Button asChild variant={action ? "outline" : "default"}>
            <Link href="/">로비로 돌아가기</Link>
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export function RoomClient({ code }: { code: string }) {
  const router = useRouter();
  const lobby = useLobby();
  const youId = lobby.you?.id ?? null;
  const [status, setStatus] = useState<Status>({ kind: "joining" });
  const [view, setView] = useState<RoomView | null>(null);
  const [connected, setConnected] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const prevView = useRef<RoomView | null>(null);

  const join = useCallback(async () => {
    try {
      await post(`/api/rooms/${code}/join`);
      setStatus({ kind: "joined" });
    } catch (err) {
      const e = err as Error & { status?: number };
      setStatus(e.status === 404 ? { kind: "notFound" } : { kind: "refused", message: e.message });
    }
  }, [code]);

  // 닉네임이 있으면 바로 입장합니다. 이 화면으로 돌아올 때마다 다시 확인합니다.
  useEffect(() => {
    if (!lobby.ready || !youId) return;
    const id = setTimeout(join, 0);
    return () => clearTimeout(id);
  }, [lobby.ready, youId, join]);

  const joined = status.kind === "joined";
  useEffect(() => {
    if (!joined) return;
    const source = new EventSource(`/api/rooms/${code}/events`);
    source.onopen = () => setConnected(true);
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as RoomView;
      syncClock(next.serverNow);
      setView(next);
    };
    // 그림판은 화면 상태와 따로 흘러옵니다.
    source.addEventListener("canvas", (event) => {
      drawStore.reset(JSON.parse((event as MessageEvent).data) as Stroke[]);
    });
    source.addEventListener("stroke", (event) => {
      drawStore.append(JSON.parse((event as MessageEvent).data) as Stroke);
    });
    // 스스로 나갔거나 방장이 내보낸 경우
    source.addEventListener("gone", () => {
      source.close();
      setView(null);
      setStatus({ kind: "left" });
    });
    source.onerror = () => {
      setConnected(false);
      // 서버가 방을 닫았으면 브라우저가 재연결을 포기합니다. 방이 아직 있는지 다시 확인합니다.
      if (source.readyState === EventSource.CLOSED) {
        setView(null);
        setStatus({ kind: "joining" });
        join();
      }
    };
    return () => source.close();
  }, [code, joined, join]);

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

  if (status.kind === "notFound") {
    return <Notice title="방을 찾을 수 없습니다">코드가 틀렸거나, 모두 나가서 방이 닫혔습니다.</Notice>;
  }
  if (status.kind === "refused") {
    return <Notice title="입장할 수 없습니다">{status.message}</Notice>;
  }
  if (status.kind === "left") {
    return (
      <Notice
        title="방에서 나왔습니다"
        action={
          <Button
            onClick={() => {
              setStatus({ kind: "joining" });
              join();
            }}
          >
            다시 입장
          </Button>
        }
      >
        다시 들어가려면 아래 버튼을 누르세요.
      </Notice>
    );
  }
  if (lobby.ready && !youId) {
    return (
      <Notice title={`방 ${code}`} action={<Button onClick={openNickname}>닉네임 정하기</Button>}>
        닉네임을 정하면 바로 입장합니다.
      </Notice>
    );
  }
  if (!view) {
    return (
      <p className="py-32 text-center">
        <Blink className="fs-15 text-muted-foreground">LOADING</Blink>
      </p>
    );
  }

  const game = getGame(view.game)!;
  const inLobby = view.state.phase === "lobby";
  const solo = game.solo === true;
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
  const props = { send, nameOf };

  return (
    <div data-game={view.game} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="방 나가기"
                // 대기실에서는 바로 나가고, 게임 중에는 한 번 확인합니다.
                onClick={() => (inLobby || solo ? leave() : setConfirmLeave(true))}
              >
                <ArrowLeft />
              </Button>
            </TooltipTrigger>
            <TooltipContent>방 나가기</TooltipContent>
          </Tooltip>
          <GameIcon game={view.game} className="size-10" />
          <h1 className="font-pixel truncate fs-2 text-foreground">{game.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 혼자 하는 게임에는 초대할 방이 없습니다. */}
          {!solo && (
            <>
              <div className="flex h-10 items-center gap-2 border-2 border-ink bg-inset px-3">
                <span className="font-pixel fs-1 text-muted-foreground">ROOM</span>
                <span className="font-pixel fs-2 tracking-[0.15em] text-foreground">{view.code}</span>
              </div>
              <Button variant="secondary" onClick={copyLink}>
                {copied ? <Check /> : <LinkIcon />}
                초대 링크
              </Button>
            </>
          )}
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
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{game.title}</DialogTitle>
                <DialogDescription>
                  {game.description} · {game.players}
                </DialogDescription>
              </DialogHeader>
              <Rules rules={game.rules} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>게임 중에 나갈까요?</AlertDialogTitle>
            <AlertDialogDescription>
              나가면 이번 판에는 다시 참여할 수 없습니다.
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

      {!connected && (
        <p role="status" className="border-2 border-pop-yellow px-3 py-2 text-center text-sm text-pop-yellow">
          연결이 끊겼습니다. 다시 연결하는 중…
        </p>
      )}

      {!inLobby && !solo && view.game !== "draw" && (
        <ul className="flex flex-wrap gap-2" aria-label="참가자">
          {view.players.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex h-8 items-center gap-2 border-2 bg-card pr-2.5 pl-1 text-sm",
                p.id === view.you ? "border-foreground/70" : "border-border",
                !p.online && "opacity-45",
              )}
            >
              <PixelAvatar seed={p.id} className="size-5 border-0" />
              <span className="max-w-28 truncate">{p.name}</span>
              {p.id === view.hostId && <Crown aria-label="방장" className="size-4 text-pop-yellow" />}
              {!p.online && <span className="text-xs text-muted-foreground">끊김</span>}
            </li>
          ))}
        </ul>
      )}

      {view.game === "draw" && <Draw view={view} {...props} />}
      {view.game === "chosung" && <Chosung view={view} {...props} />}
      {view.game === "liar" && <Liar view={view} {...props} />}
      {view.game === "typing" && <Typing view={view} {...props} />}
      {view.game === "wordchain" && <WordChain view={view} {...props} />}
      {view.game === "baseball" && <Baseball view={view} {...props} />}
      {view.game === "word" && <Word view={view} {...props} />}
      {view.game === "snake" && <Snake view={view} {...props} />}
      {view.game === "memory" && <Memory view={view} {...props} />}
      {view.game === "reaction" && <Reaction view={view} {...props} />}
      {view.game === "aim" && <Aim view={view} {...props} />}
      {view.game === "stairs" && <Stairs view={view} {...props} />}
    </div>
  );
}
