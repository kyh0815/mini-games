import type { GameSlug } from "@/lib/games";
import type { GameAction } from "@/lib/types";
import type { Player, Room } from "../rooms";
import { chosungGame } from "./chosung";
import { liarGame } from "./liar";
import { typingGame } from "./typing";
import { wordChainGame } from "./wordchain";

export type GameModule = {
  init(): unknown;
  handle(room: Room, player: Player, action: GameAction, isHost: boolean): void;
  /** 해당 플레이어에게 보여도 되는 정보만 담아 돌려줍니다. */
  view(room: Room, playerId: string): unknown;
};

export const gameModules: Record<GameSlug, GameModule> = {
  chosung: chosungGame,
  liar: liarGame,
  typing: typingGame,
  wordchain: wordChainGame,
};
