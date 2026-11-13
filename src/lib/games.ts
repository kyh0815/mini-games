export type GameSlug =
  | "draw"
  | "chosung"
  | "liar"
  | "typing"
  | "wordchain"
  | "baseball"
  | "word"
  | "snake"
  | "memory"
  | "reaction"
  | "aim"
  | "stairs";

export type Game = {
  /** URL 경로에 쓰이는 식별자: /games/[slug] */
  slug: GameSlug;
  title: string;
  description: string;
  /** 권장 인원 */
  players: string;
  minPlayers: number;
  maxPlayers: number;
  /** 혼자 하고 기록을 명예의 전당에 남기는 게임 */
  solo?: boolean;
  rules: string[];
};

export const games: Game[] = [
  {
    slug: "draw",
    title: "그림 퀴즈",
    description: "한 명이 제시어를 그림으로 그리고, 나머지가 채팅으로 맞힙니다.",
    players: "2~12명",
    minPlayers: 2,
    maxPlayers: 12,
    rules: [
      "차례가 된 사람은 단어 셋 중 하나를 골라 그림으로 그립니다. 글자나 숫자를 쓰면 반칙입니다.",
      "나머지는 채팅창에 답을 입력합니다. 글자가 정확히 같아야 정답입니다.",
      "가장 먼저 맞힌 사람이 점수를 얻고 그 차례는 바로 끝납니다. 빨리 맞힐수록 점수가 높고, 그린 사람도 절반을 받습니다.",
      "시간이 절반 지나면 초성이 힌트로 공개됩니다.",
      "모두 한 번씩(또는 정한 바퀴 수만큼) 그리면 끝나고, 점수가 가장 높은 사람이 이깁니다.",
    ],
  },
  {
    slug: "chosung",
    title: "초성 퀴즈",
    description: "초성만 보고 단어를 가장 먼저 맞히면 점수를 얻습니다.",
    players: "1~12명",
    minPlayers: 1,
    maxPlayers: 12,
    rules: [
      "주제와 초성이 화면에 나옵니다.",
      "가장 먼저 정답을 입력한 사람이 1점을 얻습니다.",
      "10초가 지나면 첫 글자가 힌트로 공개되고, 20초가 지나면 정답이 공개됩니다.",
    ],
  },
  {
    slug: "liar",
    title: "라이어 게임",
    description: "한 명만 제시어를 모릅니다. 대화로 라이어를 찾아내세요.",
    players: "3~12명",
    minPlayers: 3,
    maxPlayers: 12,
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
    description: "같은 문장을 누가 먼저 정확히 치는지 실시간으로 겨룹니다.",
    players: "1~12명",
    minPlayers: 1,
    maxPlayers: 12,
    rules: [
      "카운트다운이 끝나면 모두 같은 문장을 입력합니다.",
      "오타가 있으면 완주로 인정되지 않습니다. 붙여넣기는 막혀 있습니다.",
      "먼저 끝낸 순서대로 순위가 정해지고 타수가 표시됩니다.",
    ],
  },
  {
    slug: "wordchain",
    title: "끝말잇기",
    description: "앞 단어의 끝 글자로 시작하는 단어를 제한 시간 안에 이어 갑니다.",
    players: "2~12명",
    minPlayers: 2,
    maxPlayers: 12,
    rules: [
      "자기 차례에 앞 단어의 끝 글자로 시작하는 단어를 입력합니다. 두음법칙을 쓸 수 있습니다.",
      "이미 나온 단어는 쓸 수 없습니다.",
      "시간 안에 못 내면 목숨을 하나 잃고, 다음 사람이 새 단어로 시작합니다.",
      "없는 단어 같으면 '이의 제기'를 누르세요. 과반이 동의하면 무효가 되고 목숨을 잃습니다.",
      "마지막까지 살아남은 사람이 이깁니다.",
    ],
  },
  {
    slug: "baseball",
    title: "숫자 야구",
    description: "서로 숨긴 숫자를 번갈아 추리합니다. 먼저 맞히는 사람이 이깁니다.",
    players: "2명",
    minPlayers: 2,
    maxPlayers: 2,
    rules: [
      "각자 서로 다른 숫자로 된 비밀 숫자를 정합니다.",
      "번갈아 상대의 숫자를 추리합니다. 숫자와 자리가 모두 맞으면 스트라이크, 숫자만 맞으면 볼입니다.",
      "모든 자리를 스트라이크로 맞히면 승리입니다.",
      "먼저 시작한 사람이 맞히면 상대에게도 마지막 기회를 한 번 줍니다. 둘 다 맞히면 무승부입니다.",
    ],
  },
  {
    slug: "word",
    title: "낱말 맞히기",
    description: "자음과 모음을 하나씩 채워 숨은 낱말을 여섯 번 안에 맞힙니다.",
    players: "1~12명",
    minPlayers: 1,
    maxPlayers: 12,
    rules: [
      "낱말을 자판 기준으로 자음·모음 하나씩 풀어 칸을 채웁니다. 감자는 ㄱㅏㅁㅈㅏ, 다섯 칸입니다.",
      "쌍자음과 겹모음은 나눠 씁니다. ㄲ은 ㄱㄱ, ㅘ는 ㅗㅏ, ㅖ는 ㅕㅣ, ㅒ는 ㅑㅣ입니다.",
      "입력하면 칸마다 표시가 나옵니다. 자리까지 맞으면 초록, 다른 자리에 있으면 노랑, 없으면 회색입니다.",
      "모두 같은 낱말을 풉니다. 적은 시도로, 그다음엔 빨리 맞힌 사람이 이깁니다.",
    ],
  },
  {
    slug: "snake",
    title: "스네이크 배틀",
    description: "한 판에서 여러 뱀이 먹이를 먹으며 자랍니다. 마지막까지 살아남으세요.",
    players: "1~8명",
    minPlayers: 1,
    maxPlayers: 8,
    rules: [
      "방향키나 WASD로 방향을 바꿉니다. 모바일에서는 화면의 방향 버튼을 누릅니다.",
      "먹이를 먹으면 길어지고 점수를 얻습니다.",
      "벽이나 뱀의 몸에 부딪히면 탈락합니다. 머리끼리 부딪히면 둘 다 탈락합니다.",
      "마지막까지 살아남은 사람이 이깁니다. 혼자 하면 점수에 도전합니다.",
    ],
  },
  {
    slug: "memory",
    title: "기억력 게임",
    description: "뒤집힌 카드에서 같은 짝을 모두 찾습니다. 기록은 명예의 전당에 남습니다.",
    players: "1명",
    minPlayers: 1,
    maxPlayers: 1,
    solo: true,
    rules: [
      "카드를 두 장씩 뒤집어 같은 그림을 찾습니다.",
      "첫 카드를 뒤집는 순간부터 시간을 잽니다.",
      "모든 짝을 찾는 데 걸린 시간이 기록됩니다. 난이도마다 순위가 따로 있습니다.",
    ],
  },
  {
    slug: "reaction",
    title: "반응속도",
    description: "신호가 바뀌는 순간 누릅니다. 다섯 번의 평균이 기록됩니다.",
    players: "1명",
    minPlayers: 1,
    maxPlayers: 1,
    solo: true,
    rules: [
      "화면이 초록으로 바뀌는 순간 클릭하거나 스페이스를 누릅니다.",
      "바뀌기 전에 누르면 부정 출발입니다. 그 회차를 다시 합니다.",
      "다섯 번의 평균 반응 시간이 명예의 전당에 기록됩니다.",
    ],
  },
  {
    slug: "aim",
    title: "에임 트레이너",
    description: "30초 동안 나타나는 표적을 최대한 많이 맞힙니다.",
    players: "1명",
    minPlayers: 1,
    maxPlayers: 1,
    solo: true,
    rules: [
      "표적을 클릭하면 다음 표적이 나타납니다.",
      "30초 동안 맞힌 개수가 점수입니다. 빗나간 클릭은 명중률을 떨어뜨립니다.",
      "점수가 같으면 명중률이 높은 쪽이 위입니다.",
    ],
  },
  {
    slug: "stairs",
    title: "계단 오르기",
    description: "좌우로 꺾이는 계단을 방향에 맞춰 최대한 높이 오릅니다.",
    players: "1명",
    minPlayers: 1,
    maxPlayers: 1,
    solo: true,
    rules: [
      "다음 계단이 왼쪽이면 ←, 오른쪽이면 →를 누릅니다. 모바일에서는 화면 버튼을 누릅니다.",
      "방향을 틀리면 떨어집니다.",
      "체력 막대가 계속 줄어듭니다. 오를 때마다 다시 차지만, 높이 올라갈수록 빨리 줄어듭니다.",
      "오른 계단 수가 명예의 전당에 기록됩니다.",
    ],
  },
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}
