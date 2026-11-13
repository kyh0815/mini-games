"use client";

import type { ReactNode } from "react";
import { Label11, Panel, Screen } from "@/components/arcade/panel";
import { Trophy } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { getGame } from "@/lib/games";
import { formatRecord, getBoard, type BoardRows } from "@/lib/records";
import type { RoomView } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Rules } from "./shared";

/** 순위표 하나. 내 이름이 있으면 강조합니다. */
export function RecordList({ rows, boardKey, me }: { rows: BoardRows["rows"]; boardKey: string; me?: string }) {
  const board = getBoard(boardKey)!;
  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        아직 기록이 없습니다. 첫 기록의 주인공이 되어 보세요.
      </p>
    );
  }
  return (
    <ol className="flex flex-col p-2">
      {rows.map((row, i) => (
        <li
          key={row.name}
          className={cn(
            "flex h-9 items-center gap-3 px-2 text-sm",
            row.name === me && "bg-accent",
          )}
        >
          <span
            className={cn(
              "font-pixel w-5 fs-15 tabular-nums",
              i === 0 ? "text-pop-yellow" : "text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
          <span className="font-pixel fs-15 tabular-nums">{formatRecord(board, row.value)}</span>
        </li>
      ))}
    </ol>
  );
}

/** 혼자 하는 게임의 공통 배치: 왼쪽에 게임, 오른쪽에 명예의 전당 */
export function SoloShell({
  view,
  boardKey,
  children,
}: {
  view: RoomView;
  boardKey: string;
  children: ReactNode;
}) {
  const state = view.state as { boards?: BoardRows[] };
  const rows = state.boards?.find((b) => b.key === boardKey)?.rows ?? [];
  const me = view.players.find((p) => p.id === view.you)?.name;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0">{children}</div>
      <Panel
        label="HALL OF FAME"
        action={<span className="text-xs text-muted-foreground">{getBoard(boardKey)?.label.split(" · ")[1]}</span>}
      >
        <RecordList rows={rows} boardKey={boardKey} me={me} />
      </Panel>
    </div>
  );
}

/** 시작 전 화면: 규칙, 옵션, 시작 버튼 */
export function SoloIntro({
  view,
  onStart,
  children,
}: {
  view: RoomView;
  onStart: () => void;
  children?: ReactNode;
}) {
  const game = getGame(view.game)!;
  return (
    <Screen>
      <div className="flex flex-col gap-6 p-5 sm:p-7">
        <Rules rules={game.rules} />
        {children && <div className="flex flex-col gap-4 border-t-2 border-border pt-5">{children}</div>}
        <Button variant="game" size="lg" onClick={onStart}>
          시작
        </Button>
      </div>
    </Screen>
  );
}

/** 끝난 뒤 화면: 이번 기록, 순위, 다시 하기 */
export function SoloResult({
  last,
  detail,
  onRetry,
  onBack,
  children,
}: {
  last: { board: string; value: number; rank: number; best: boolean } | null;
  detail?: ReactNode;
  onRetry: () => void;
  onBack: () => void;
  children?: ReactNode;
}) {
  const board = last ? getBoard(last.board) : undefined;
  return (
    <Screen>
      <div className="flex flex-col items-center gap-6 px-5 py-9 text-center">
        <div className="flex animate-pop flex-col items-center gap-2">
          <Label11 className={cn(last?.best && "text-pop-green")}>
            {last?.best ? "NEW RECORD" : "RESULT"}
          </Label11>
          <p className="font-pixel fs-4 text-foreground">
            {last && board ? formatRecord(board, last.value) : "-"}
          </p>
          {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
        </div>
        {last && (
          <p className="flex items-center gap-2 border-2 border-border px-3 py-2 text-left text-sm">
            <Trophy className="size-5 shrink-0 text-pop-yellow" />
            <span>
              이번 기록은 명예의 전당 <b className="font-semibold">{last.rank}위</b>에 해당합니다.
              {!last.best && <span className="text-muted-foreground"> 내 최고 기록은 그대로입니다.</span>}
            </span>
          </p>
        )}
        {children}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>
            설정으로
          </Button>
          <Button variant="game" size="lg" onClick={onRetry}>
            다시 하기
          </Button>
        </div>
      </div>
    </Screen>
  );
}
