# MINI ARCADE

팀원들과 함께 즐기는 실시간 미니게임 오락실. 닉네임을 정하고 들어오면 열린 방과 접속 중인 사람이 보이고, 방을 만들거나 골라서 바로 함께 플레이합니다.

## 게임

| 게임 | 인원 | 설명 |
|---|---|---|
| 그림 퀴즈 | 2~12명 | 한 명이 제시어를 그리고 나머지가 채팅으로 맞히기 |
| 초성 퀴즈 | 1~12명 | 초성만 보고 단어를 가장 먼저 맞히면 득점 |
| 라이어 게임 | 3~12명 | 제시어를 모르는 한 명을 대화와 투표로 찾아내기 |
| 타자 속도 대결 | 1~12명 | 같은 문장을 누가 먼저 정확히 치는지 겨루기 |
| 끝말잇기 | 2~12명 | 제한 시간 안에 끝 글자로 단어 잇기 (목숨 3개) |

## 개발

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm test           # 게임 규칙 단위 테스트
```

## 배포할 때 주의

방, 세션, 게임 상태는 모두 **서버 프로세스의 메모리**에 있습니다 (`src/server/`).

- Node 서버 한 대에서 `npm run build && npm start` 로 띄워야 합니다.
- Vercel 같은 서버리스 환경이나 여러 인스턴스로 띄우면 요청마다 다른 메모리를 보게 되어 동작하지 않습니다.
- 서버를 재시작하면 진행 중이던 방과 닉네임이 모두 사라집니다.
- 프록시 뒤에 둘 경우 `/api/lobby/events`, `/api/rooms/*/events` (Server-Sent Events) 응답을 버퍼링하지 않도록 설정해야 합니다.

## 구조

- `src/lib/games.ts` — 게임 목록과 규칙 설명
- `src/lib/types.ts` — 서버가 화면에 내려보내는 상태의 타입
- `src/lib/audio.ts` — 배경 음악과 효과음. 음원 파일 없이 Web Audio로 합성합니다.
- `src/lib/lobby-store.ts` — 로비(방 목록·접속자) 실시간 연결
- `src/server/session.ts` — 닉네임과 세션
- `src/server/lobby.ts` — 방 목록과 접속자 목록 전파
- `src/server/rooms.ts` — 방 저장소, 입장/퇴장, 타이머, 상태 전파
- `src/server/games/` — 게임별 규칙. `view()`가 플레이어마다 보여도 되는 정보만 골라 보냅니다.
- `src/server/data/` — 단어와 타자 문장
- `src/app/api/` — 닉네임, 로비 스트림, 방 만들기·입장·동작·상태 스트림(SSE)
- `src/components/ui/` — shadcn/ui 컴포넌트 (테마에 맞게 수정)
- `src/components/arcade/` — 패널, 타이머, 픽셀 아바타 등 테마 전용 컴포넌트
- `src/components/games/` — 게임별 화면

## 실시간 구조

- 화면 상태는 방마다 Server-Sent Events 한 줄로 내려가고, 동작은 POST로 올라갑니다.
- 상태가 바뀔 때마다 서버가 플레이어별 화면 상태를 통째로 보냅니다. 클라이언트는 받은 대로 그리기만 합니다.
- 그림 퀴즈의 획처럼 잦은 데이터는 화면 상태와 분리해 작은 이벤트로만 보냅니다.
- 로비 연결 하나가 사이트 전체의 '접속 중' 표시를 겸합니다.

## 디자인

절제된 레트로 테마입니다. 먹색 바탕, 단단한 그림자, 픽셀 폰트는 제목·숫자·라벨에만 씁니다. 색과 글꼴은 `src/app/globals.css`의 변수로 관리하고, 게임마다 대표색(`--game`)이 `data-game` 속성으로 바뀝니다. 픽셀 폰트 크기는 `fs-1` ~ `fs-6` 유틸리티를 씁니다.

## 보안

- 세션은 HttpOnly · SameSite=Strict 쿠키로만 주고받습니다.
- 숨겨야 하는 정보(라이어 게임·그림 퀴즈의 제시어 등)는 해당 플레이어에게 아예 전송하지 않습니다.
- 닉네임·방 만들기·입장에는 IP별 횟수 제한이 있고, 프로덕션 응답에는 CSP 등 보안 헤더가 붙습니다.

### 게임 추가하기

1. `src/lib/games.ts`에 게임 정보 추가
2. `src/lib/types.ts`에 화면 상태 타입 추가
3. `src/server/games/`에 규칙 모듈을 만들고 `index.ts`에 등록
4. `src/components/games/`에 화면을 만들고 `RoomClient.tsx`에 연결

## 알려진 한계

- 끝말잇기는 사전 검증이 없습니다. 형식(한글 2~10자), 끝 글자, 중복만 검사하고, 없는 단어는 참가자들의 '이의 제기' 과반으로 걸러냅니다.

## 스택

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix)

## 글꼴과 아이콘

- [Galmuri](https://github.com/quiple/galmuri) — SIL Open Font License 1.1
- [Pretendard](https://github.com/orioncactus/pretendard) — SIL Open Font License 1.1
- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) — SIL Open Font License 1.1
- [Pixelarticons](https://github.com/halfmage/pixelarticons) — MIT
