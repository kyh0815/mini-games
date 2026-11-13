# MINI GAME HEAVEN (미니게임 천국)

팀원들과 함께 즐기는 미니게임 모음. 닉네임을 정하고 들어오면 열린 방과 접속 중인 사람이 보이고, 방을 만들거나 골라서 바로 함께 플레이합니다.

## 게임

멀티 플레이어 게임은 방을 만들어 함께하고(비밀번호를 걸 수 있습니다), 1인 플레이어 게임은 기록이 명예의 전당에 남습니다.

| 게임 | 인원 | 설명 |
|---|---|---|
| 그림 퀴즈 | 2~12명 | 한 명이 제시어를 그리고 나머지가 채팅으로 맞히기 |
| 초성 퀴즈 | 1~12명 | 초성만 보고 단어를 가장 먼저 맞히면 득점 |
| 라이어 게임 | 3~12명 | 제시어를 모르는 한 명을 대화와 투표로 찾아내기 |
| 타자 속도 대결 | 1~12명 | 같은 문장을 누가 먼저 정확히 치는지 겨루기 |
| 끝말잇기 | 2~12명 | 제한 시간 안에 끝 글자로 단어 잇기 (목숨 3개) |
| 숫자 야구 | 2명 | 서로 숨긴 숫자를 번갈아 추리하기 |
| 낱말 맞히기 | 1~12명 | 자음·모음을 하나씩 채워 숨은 낱말을 여섯 번 안에 맞히기 |
| 스네이크 배틀 | 1~8명 | 한 판에서 여러 뱀이 먹이를 먹으며 살아남기 |
| 기억력 게임 | 혼자 | 같은 짝을 모두 찾는 시간 기록 |
| 반응속도 | 혼자 | 신호에 반응하는 시간 다섯 번의 평균 |
| 에임 트레이너 | 혼자 | 30초 동안 맞힌 표적 수 |
| 계단 오르기 | 혼자 | 좌우로 꺾이는 계단을 오른 수 |

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

### 공지 띄우기

서버를 내리기 전처럼 모두에게 알릴 일이 있으면, 접속 중인 모든 화면(게임 중 포함)에 공지를 실시간으로 띄울 수 있습니다. `ADMIN_TOKEN` 환경 변수를 정해 두고 서버를 띄운 경우에만 동작합니다.

```bash
# 띄우기 (80자까지)
curl -X POST http://localhost:3000/api/admin/notice \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"곧 서버 점검 예정입니다."}'

# 내리기
curl -X DELETE http://localhost:3000/api/admin/notice -H "Authorization: Bearer $ADMIN_TOKEN"
```

명예의 전당 기록만은 파일에 저장되어 재시작해도 남습니다.

- 기본 위치는 실행 폴더의 `.data/records.json` 이고, `DATA_DIR` 환경 변수로 바꿀 수 있습니다.
- 이 파일에는 사람들의 닉네임이 들어 있으므로 저장소에 올리지 않습니다 (`.gitignore`에 포함).
- 반응속도·에임·계단 기록은 각자 기기에서 잰 값을 서버가 범위만 검증해 받습니다. 사내에서 재미로 쓰는 용도이며, 조작을 완전히 막지는 못합니다.

## 구조

- `src/lib/games.ts` — 게임 목록과 규칙 설명
- `src/lib/types.ts` — 서버가 화면에 내려보내는 상태의 타입
- `src/lib/audio.ts` — 배경 음악과 효과음. 음원 파일 없이 Web Audio로 합성합니다.
- `src/lib/lobby-store.ts` — 로비(방 목록·접속자) 실시간 연결
- `src/server/session.ts` — 닉네임과 세션
- `src/server/lobby.ts` — 방 목록과 접속자 목록, 공지 전파
- `src/server/records.ts` — 명예의 전당 (파일 저장)
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

1. `src/lib/games.ts`에 게임 정보 추가 (혼자 하는 게임은 `solo: true`, 순위표는 `src/lib/records.ts`)
2. `src/lib/types.ts`에 화면 상태 타입 추가
3. `src/server/games/`에 규칙 모듈을 만들고 `index.ts`에 등록
4. `src/components/games/`에 화면을 만들고 `RoomClient.tsx`에 연결

## 알려진 한계

- 끝말잇기와 낱말 맞히기는 사전 검증이 없습니다. 끝말잇기는 참가자들의 '이의 제기'로 없는 단어를 걸러내고, 낱말 맞히기는 칸 수만 맞으면 어떤 자모 조합이든 시도로 받습니다.

## 스택

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui (Radix)

## 글꼴과 아이콘

- [Galmuri](https://github.com/quiple/galmuri) — SIL Open Font License 1.1
- [Pretendard](https://github.com/orioncactus/pretendard) — SIL Open Font License 1.1
- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) — SIL Open Font License 1.1
- [Pixelarticons](https://github.com/halfmage/pixelarticons) — MIT
