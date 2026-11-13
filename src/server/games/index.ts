import type { GameSlug } from "@/lib/games";
import type { GameAction } from "@/lib/types";
import type { Player, Room } from "../rooms";
import { chosungGame } from "./chosung";
import { drawGame } from "./draw";
import { liarGame } from "./liar";
import { typingGame } from "./typing";
import { wordChainGame } from "./wordchain";

export type GameModule = {
  init(): unknown;
  /** "quiet"을 돌려주면 화면 상태를 다시 보내지 않습니다. */
  handle(room: Room, player: Player, action: GameAction, isHost: boolean): void | "quiet";
  /** 새 연결에만 따로 보내 줄 것이 있을 때 (그림판 전체 등) */
  onSubscribe?(room: Room, send: (event: string, data: unknown) => void): void;
  /** 해당 플레이어에게 보여도 되는 정보만 담아 돌려줍니다. */
  view(room: Room, playerId: string): unknown;
};

export const gameModules: Record<GameSlug, GameModule> = {
  draw: drawGame,
  chosung: chosungGame,
  liar: liarGame,
  typing: typingGame,
  wordchain: wordChainGame,
};
