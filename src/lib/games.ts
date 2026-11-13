export type Game = {
  /** URL 경로에 쓰이는 식별자: /games/[slug] */
  slug: string;
  title: string;
  description: string;
  /** 권장 인원 (예: "2-8명") */
  players: string;
};

/** 새 게임을 추가할 때 여기에 등록하면 홈 화면에 노출됩니다. */
export const games: Game[] = [];
