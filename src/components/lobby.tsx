"use client";

import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GameIcon } from "@/components/arcade/game-icon";
import { askNickname } from "@/components/arcade/nickname";
import { Label11, Panel } from "@/components/arcade/panel";
import { PixelAvatar } from "@/components/arcade/pixel-avatar";
import { Rules } from "@/components/games/shared";
import { ArrowRight, Users } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { audio } from "@/lib/audio";
import { post } from "@/lib/client";
import { games, getGame, type Game } from "@/lib/games";
import { useLobby } from "@/lib/lobby-store";
import { cn } from "@/lib/utils";

/** 닉네임이 없으면 먼저 정하게 한 뒤 방으로 들어갑니다. */
function useEnterRoom() {
  const router = useRouter();
  const lobby = useLobby();
  return async (code: string) => {
    if (!lobby.you && !(await askNickname())) return;
    router.push(`/rooms/${code}`);
  };
}

function RoomList({ onBrowseGames }: { onBrowseGames: () => void }) {
  const lobby = useLobby();
  const enter = useEnterRoom();
  if (!lobby.ready) return <div className="h-[4.5rem] border-2 border-dashed border-border" />;
  if (lobby.rooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 border-2 border-dashed border-border px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          아직 열린 방이 없습니다. 게임을 골라 첫 방을 만들어 보세요.
        </p>
        <Button onClick={onBrowseGames}>게임 목록 보기</Button>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {lobby.rooms.map((room) => {
        const game = getGame(room.game)!;
        const full = room.players >= room.max;
        return (
          <li key={room.code}>
            <button
              type="button"
              onClick={() => enter(room.code)}
              className="group flex w-full items-center gap-3 border-2 border-ink bg-card p-3 text-left outline-none pixel-shadow transition-[transform,box-shadow] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            >
              <GameIcon game={room.game} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{room.host}의 방</span>
                <span className="truncate text-sm text-muted-foreground">{game.title}</span>
              </span>
              <span
                className={cn(
                  "hidden items-center gap-1.5 text-xs sm:flex",
                  room.playing ? "text-pop-yellow" : "text-pop-green",
                )}
              >
                <span className="size-1.5 bg-current" />
                {room.playing ? "게임 중" : "대기 중"}
              </span>
              <span className="flex w-14 items-center justify-end gap-1.5 text-sm text-muted-foreground tabular-nums">
                <Users className="size-4" />
                {room.players}/{room.max}
              </span>
              <span className="font-pixel hidden w-12 text-right fs-1 text-muted-foreground sm:block">
                {room.code}
              </span>
              <span className="text-sm font-semibold text-primary group-hover:underline">
                {full ? "관전" : "입장"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function JoinByCode({ onEnter }: { onEnter: (code: string) => void }) {
  const [code, setCode] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 4) onEnter(code);
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="room-code" className="text-sm text-muted-foreground">
        코드로 입장
      </label>
      <InputOTP
        id="room-code"
        maxLength={4}
        value={code}
        onChange={(value) => setCode(value.toUpperCase())}
        onComplete={(value: string) => onEnter(value.toUpperCase())}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        inputMode="text"
        autoComplete="off"
        aria-label="방 코드 4자리"
      >
        <InputOTPGroup>
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot key={i} index={i} className="size-9 fs-15" />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </form>
  );
}

function GameGrid() {
  const router = useRouter();
  const lobby = useLobby();
  const [selected, setSelected] = useState<Game | null>(null);
  const [pending, setPending] = useState(false);

  const create = async (game: Game) => {
    setPending(true);
    try {
      if (!lobby.you && !(await askNickname())) return;
      const { code } = await post<{ code: string }>("/api/rooms", { game: game.slug });
      audio.play("coin");
      setSelected(null);
      router.push(`/rooms/${code}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      // 이동 여부와 상관없이 풀어 둡니다. 뒤로 돌아왔을 때 버튼이 잠겨 있으면 안 됩니다.
      setPending(false);
    }
  };

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {games.map((game, i) => (
          <li key={game.slug}>
            <button
              type="button"
              data-game={game.slug}
              onClick={() => setSelected(game)}
              className="group flex h-full w-full items-center gap-3 border-2 border-ink bg-card p-3 text-left outline-none pixel-shadow transition-[transform,box-shadow] hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:flex-col sm:items-stretch sm:p-4"
            >
              {/* 좁은 화면에서는 한 줄짜리 목록으로, 넓은 화면에서는 카드로 보입니다. */}
              <span className="flex items-center justify-between">
                <GameIcon game={game.slug} className="size-10" />
                <span className="font-pixel hidden fs-1 text-muted-foreground sm:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-none sm:gap-3">
                <span className="font-pixel truncate fs-15 text-foreground sm:fs-2">{game.title}</span>
                <span className="hidden flex-1 text-sm/relaxed text-muted-foreground sm:block">
                  {game.description}
                </span>
                <span className="text-xs text-muted-foreground sm:hidden">{game.players}</span>
              </span>
              <span className="hidden flex-1 sm:block" />
              <span className="flex items-center justify-between text-sm sm:border-t-2 sm:border-border sm:pt-3">
                <span className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
                  <Users className="size-4" />
                  {game.players}
                </span>
                <ArrowRight className="size-5 text-game transition-transform group-hover:translate-x-1" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && (
          <DialogContent data-game={selected.slug} className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <GameIcon game={selected.slug} className="size-10" />
                <DialogTitle>{selected.title}</DialogTitle>
              </div>
              <DialogDescription>
                {selected.description} · {selected.players}
              </DialogDescription>
            </DialogHeader>
            <Rules rules={selected.rules} />
            <Button size="lg" disabled={pending} onClick={() => create(selected)}>
              {pending ? "만드는 중…" : "방 만들기"}
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

type Tab = "rooms" | "games";

/** 홈의 본문. 열린 방과 게임 목록을 탭으로 나눕니다. */
export function LobbyTabs() {
  const lobby = useLobby();
  const enter = useEnterRoom();
  const [tab, setTab] = useState<Tab | null>(null);
  // 처음 들어왔을 때만 자동으로 고릅니다: 열린 방이 있으면 방 목록, 없으면 게임 목록.
  // 그 뒤로는 방이 생기거나 없어져도 보고 있던 탭을 바꾸지 않습니다.
  if (tab === null && lobby.ready) setTab(lobby.rooms.length > 0 ? "rooms" : "games");
  const current = tab ?? "rooms";

  return (
    <Tabs value={current} onValueChange={(value) => setTab(value as Tab)}>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b-2 border-ink">
        <TabsList className="border-b-0">
          <TabsTrigger value="rooms">
            열린 방
            <span
              className={cn(
                "font-pixel flex h-5 min-w-5 items-center justify-center px-1 fs-1 tabular-nums",
                lobby.rooms.length > 0 ? "bg-primary text-ink" : "bg-muted text-muted-foreground",
              )}
            >
              {lobby.rooms.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="games">
            게임 목록
            <span className="font-pixel flex h-5 min-w-5 items-center justify-center bg-muted px-1 fs-1 text-muted-foreground tabular-nums">
              {games.length}
            </span>
          </TabsTrigger>
        </TabsList>
        <div className="pb-2">
          <JoinByCode onEnter={enter} />
        </div>
      </div>
      <TabsContent value="rooms">
        <RoomList onBrowseGames={() => setTab("games")} />
      </TabsContent>
      <TabsContent value="games">
        <GameGrid />
      </TabsContent>
    </Tabs>
  );
}

export function OnlineUsers() {
  const lobby = useLobby();
  const enter = useEnterRoom();
  return (
    <Panel
      label="ONLINE"
      action={
        <span className="flex items-center gap-1.5 text-xs text-pop-green tabular-nums">
          <span className="size-1.5 bg-current" />
          {lobby.users.length}명 접속 중
        </span>
      }
    >
      {lobby.users.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          {lobby.ready ? "닉네임을 정하면 여기에 표시됩니다." : "불러오는 중…"}
        </p>
      ) : (
        <ul className="flex max-h-[28rem] flex-col overflow-y-auto p-2">
          {lobby.users.map((user) => {
            const me = user.id === lobby.you?.id;
            const game = user.room ? getGame(user.room.game) : null;
            return (
              <li key={user.id} className="flex items-center gap-2.5 px-2 py-1.5">
                <PixelAvatar seed={user.id} className="size-7" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {user.name}
                  {me && <span className="ml-1.5 text-xs font-normal text-muted-foreground">나</span>}
                </span>
                {user.room && game ? (
                  <button
                    type="button"
                    data-game={user.room.game}
                    onClick={() => enter(user.room!.code)}
                    className="truncate text-xs text-game underline-offset-2 outline-none hover:underline focus-visible:underline"
                  >
                    {game.title}
                  </button>
                ) : (
                  <Label11>LOBBY</Label11>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
