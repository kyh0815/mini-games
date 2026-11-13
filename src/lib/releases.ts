/**
 * 업데이트 소식(릴리즈 노트). 새 소식은 배열 맨 앞에 추가합니다.
 * 문구는 한국어로 쓰고, 일본어는 src/lib/i18n/ja/releases.ts에 같은 문장을 열쇠로 넣습니다.
 */
export type ReleaseKind = "new" | "change" | "fix";
export type Release = {
  version: string;
  /** YYYY.MM.DD */
  date: string;
  title: string;
  items: { kind: ReleaseKind; text: string }[];
};

export const RELEASES: Release[] = [
  {
    version: "1.0",
    date: "2026.11.13",
    title: "마스코트가 생겼어요",
    items: [
      { kind: "new", text: "사이트의 얼굴인 노란 게임기 마스코트가 생겼습니다. 처음 들어오면 인트로로 맞이합니다." },
      { kind: "new", text: "기억력 게임 2가 추가됐습니다. 카드가 뒤집히는 순서를 기억해 그대로 누르세요." },
      { kind: "new", text: "일본어를 지원합니다. 설정에서 고를 수 있고, 언어가 달라도 같은 방에서 함께 합니다." },
      { kind: "new", text: "계단 오르기에서 캐릭터를 고를 수 있습니다." },
      { kind: "new", text: "업데이트 소식 게시판이 생겼습니다. 지금 보고 계신 이곳입니다." },
      { kind: "change", text: "계단 오르기가 어려워졌습니다. 30계단마다 단계가 올라 더 빨라지고 계단이 복잡하게 꺾입니다. 순위표는 새로 시작합니다." },
      { kind: "change", text: "에임 트레이너가 30초에서 20초로 줄었습니다. 순위표는 새로 시작합니다." },
      { kind: "change", text: "명예의 전당 기록의 주인을 닉네임이 아니라 접속한 기기로 가립니다. 닉네임이 같아도 남의 기록은 바꿀 수 없습니다." },
      { kind: "change", text: "소리와 언어 설정을 톱니바퀴 메뉴 하나로 모았습니다." },
    ],
  },
  {
    version: "0.5",
    date: "2026.11.13",
    title: "MINI GAME HEAVEN",
    items: [
      { kind: "change", text: "이름이 MINI GAME HEAVEN으로 바뀌었습니다." },
      { kind: "new", text: "비밀번호 방을 만들 수 있습니다. 비밀번호를 아는 사람만 들어옵니다." },
      { kind: "new", text: "명예의 전당 1등 이름 옆에 왕관이 붙습니다." },
      { kind: "new", text: "점검 같은 공지를 모든 화면에 바로 띄울 수 있습니다." },
      { kind: "change", text: "코드로 입장하는 칸을 없앴습니다. 열린 방 목록에서 바로 들어가면 됩니다." },
    ],
  },
  {
    version: "0.4",
    date: "2026.11.13",
    title: "게임 일곱 개와 명예의 전당",
    items: [
      { kind: "new", text: "함께 하는 게임이 늘었습니다: 숫자 야구, 낱말 맞히기, 스네이크 배틀." },
      { kind: "new", text: "혼자 하는 게임이 생겼습니다: 기억력 게임, 반응속도, 에임 트레이너, 계단 오르기." },
      { kind: "new", text: "혼자 하는 게임의 기록은 명예의 전당에 남습니다." },
    ],
  },
  {
    version: "0.3",
    date: "2026.11.13",
    title: "그림 퀴즈 다듬기",
    items: [
      { kind: "change", text: "그림 퀴즈에서 붓 굵기를 조절할 수 있습니다." },
      { kind: "fix", text: "그림 퀴즈는 글자가 정확히 같은 단어만 정답이고, 입력한 말은 모두 채팅에 보입니다." },
      { kind: "fix", text: "누군가 정답을 맞히면 그 차례가 바로 끝납니다." },
      { kind: "change", text: "홈 화면을 열린 방과 게임 목록 탭으로 나눴습니다." },
    ],
  },
  {
    version: "0.2",
    date: "2026.11.13",
    title: "함께 하는 게임방",
    items: [
      { kind: "new", text: "열린 방 목록과 지금 접속 중인 사람이 보입니다." },
      { kind: "new", text: "그림 퀴즈가 추가됐습니다." },
      { kind: "change", text: "화면을 눈이 편한 차분한 레트로 느낌으로 바꿨습니다." },
      { kind: "change", text: "방에 들어가는 속도가 빨라졌습니다." },
      { kind: "fix", text: "뒤로 가기로 나온 뒤 방을 다시 만들 수 없던 문제를 고쳤습니다." },
    ],
  },
  {
    version: "0.1",
    date: "2026.11.13",
    title: "첫 오픈",
    items: [
      { kind: "new", text: "초성 퀴즈, 라이어 게임, 타자 속도 대결, 끝말잇기 네 게임으로 문을 열었습니다." },
      { kind: "new", text: "배경 음악과 효과음이 나옵니다." },
    ],
  },
];

export const LATEST_VERSION = RELEASES[0].version;
