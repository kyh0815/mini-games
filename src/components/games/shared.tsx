import type { ReactNode } from "react";
import { getGame } from "@/lib/games";
import type { GameAction, RoomView } from "@/lib/types";
import { Button, Card } from "../ui";

export type GameProps<V extends RoomView = RoomView> = {
  view: V;
  /** 서버 시계 기준 현재 시각(ms) */
  now: number;
  send: (action: GameAction) => Promise<boolean>;
  nameOf: (id: string | null | undefined) => string;
};

/** 대기실: 규칙과 방장 전용 옵션, 시작 버튼 */
export function Lobby({
  view,
  onStart,
  children,
}: {
  view: RoomView;
  onStart: () => void;
  children?: ReactNode;
}) {
  const game = getGame(view.game)!;
  const isHost = view.hostId === view.you;
  const online = view.players.filter((p) => p.online).length;
  const enough = online >= game.minPlayers;
  return (
    <Card className="flex flex-col gap-5">
      <div>
        <h2 className="mb-2 font-medium">게임 방법</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          {game.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </div>
      {isHost ? (
        <div className="flex flex-col gap-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          {children && <div className="flex flex-wrap gap-4">{children}</div>}
          <Button onClick={onStart} disabled={!enough}>
            {enough ? "게임 시작" : `${game.minPlayers}명 이상 모이면 시작할 수 있습니다`}
          </Button>
        </div>
      ) : (
        <p className="border-t border-zinc-200 pt-5 text-sm text-zinc-500 dark:border-zinc-800">
          방장이 게임을 시작하기를 기다리는 중입니다.
        </p>
      )}
    </Card>
  );
}

/** 결과 화면 아래의 '대기실로' 버튼. 방장에게만 보입니다. */
export function BackToLobby({ view, send }: Pick<GameProps, "view" | "send">) {
  if (view.hostId !== view.you) {
    return <p className="text-sm text-zinc-500">방장이 다음 판을 준비하는 중입니다.</p>;
  }
  return <Button onClick={() => send({ type: "reset" })}>대기실로 돌아가기</Button>;
}
