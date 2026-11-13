# mini-games

팀원들과 함께 즐기는 미니게임 모음 홈페이지. 방을 만들고 초대 링크(또는 4자리 코드)를 공유하면 각자 자기 기기로 접속해 함께 플레이합니다.

## 게임

| 게임 | 인원 | 설명 |
|---|---|---|
| 초성 퀴즈 | 1~12명 | 초성만 보고 단어를 가장 먼저 맞히면 득점 |
| 라이어 게임 | 3~12명 | 제시어를 모르는 한 명을 대화와 투표로 찾아내기 |
| 타자 속도 대결 | 1~12명 | 같은 문장을 누가 먼저 정확히 치는지 겨루기 |
| 끝말잇기 | 2~12명 | 제한 시간 안에 끝 글자로 단어 잇기 (목숨 3개) |

## 개발

```bash
npm install
npm run dev   # http://localhost:3000
```

## 배포할 때 주의

방과 게임 상태는 **서버 프로세스의 메모리**에 있습니다 (`src/server/rooms.ts`).

- Node 서버 한 대에서 `npm run build && npm start` 로 띄워야 합니다.
- Vercel 같은 서버리스 환경이나 여러 인스턴스로 띄우면 요청마다 다른 메모리를 보게 되어 동작하지 않습니다.
- 서버를 재시작하면 진행 중이던 방은 모두 사라집니다.
- 프록시 뒤에 둘 경우 `/api/rooms/*/events` (Server-Sent Events) 응답을 버퍼링하지 않도록 설정해야 합니다.

## 구조

- `src/lib/games.ts` — 게임 목록과 규칙 설명
- `src/lib/types.ts` — 서버가 화면에 내려보내는 상태의 타입
- `src/server/rooms.ts` — 방 저장소, 입장/퇴장, 타이머, 상태 전파
- `src/server/games/` — 게임별 규칙. `view()`가 플레이어마다 보여도 되는 정보만 골라 보냅니다.
- `src/server/data/` — 단어와 타자 문장
- `src/app/api/rooms/` — 방 만들기, 입장, 동작 전송, 상태 스트림(SSE)
- `src/components/games/` — 게임별 화면

### 게임 추가하기

1. `src/lib/games.ts`에 게임 정보 추가
2. `src/lib/types.ts`에 화면 상태 타입 추가
3. `src/server/games/`에 규칙 모듈을 만들고 `index.ts`에 등록
4. `src/components/games/`에 화면을 만들고 `RoomClient.tsx`에 연결

## 알려진 한계

- 끝말잇기는 사전 검증이 없습니다. 형식(한글 2~10자), 끝 글자, 중복만 검사하고, 없는 단어는 참가자들의 '이의 제기' 과반으로 걸러냅니다.

## 스택

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
