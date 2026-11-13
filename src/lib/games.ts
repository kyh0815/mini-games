export type GameSlug = "chosung" | "liar" | "typing" | "wordchain";

export type Game = {
  /** URL 경로에 쓰이는 식별자: /games/[slug] */
  slug: GameSlug;
  title: string;
  emoji: string;
  description: string;
  /** 권장 인원 */
  players: string;
  minPlayers: number;
  rules: string[];
};

export const games: Game[] = [
  {
    slug: "chosung",
    title: "초성 퀴즈",
    emoji: "🔤",
    description: "초성만 보고 단어를 가장 먼저 맞히면 점수를 얻습니다.",
    players: "1~12명",
    minPlayers: 1,
    rules: [
      "주제와 초성이 화면에 나옵니다.",
      "가장 먼저 정답을 입력한 사람이 1점을 얻습니다.",
      "10초가 지나면 첫 글자가 힌트로 공개되고, 20초가 지나면 정답이 공개됩니다.",
    ],
  },
  {
    slug: "liar",
    title: "라이어 게임",
    emoji: "🤥",
    description: "한 명만 제시어를 모릅니다. 대화로 라이어를 찾아내세요.",
    players: "3~12명",
    minPlayers: 3,
    rules: [
      "라이어를 뺀 모두에게 같은 제시어가 보입니다. 라이어는 주제만 압니다.",
      "정해진 순서대로 제시어를 한마디씩 설명합니다. 라이어는 들키지 않게 둘러댑니다.",
      "투표로 라이어를 지목합니다. 라이어가 지목되지 않으면 라이어 승리입니다.",
      "지목된 라이어가 제시어를 맞히면 역전해서 라이어가 이깁니다.",
    ],
  },
  {
    slug: "typing",
    title: "타자 속도 대결",
    emoji: "⌨️",
    description: "같은 문장을 누가 먼저 정확히 치는지 실시간으로 겨룹니다.",
    players: "1~12명",
    minPlayers: 1,
    rules: [
      "카운트다운이 끝나면 모두 같은 문장을 입력합니다.",
      "오타가 있으면 완주로 인정되지 않습니다. 붙여넣기는 막혀 있습니다.",
      "먼저 끝낸 순서대로 순위가 정해지고 타수가 표시됩니다.",
    ],
  },
  {
    slug: "wordchain",
    title: "끝말잇기",
    emoji: "🔗",
    description: "앞 단어의 끝 글자로 시작하는 단어를 제한 시간 안에 이어 갑니다.",
    players: "2~12명",
    minPlayers: 2,
    rules: [
      "자기 차례에 앞 단어의 끝 글자로 시작하는 단어를 입력합니다. 두음법칙을 쓸 수 있습니다.",
      "이미 나온 단어는 쓸 수 없습니다.",
      "시간 안에 못 내면 목숨을 하나 잃고, 다음 사람이 새 단어로 시작합니다.",
      "없는 단어 같으면 '이의 제기'를 누르세요. 과반이 동의하면 무효가 되고 목숨을 잃습니다.",
      "마지막까지 살아남은 사람이 이깁니다.",
    ],
  },
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}
