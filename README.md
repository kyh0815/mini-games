# mini-games

팀원들과 함께 즐기는 미니게임 모음 홈페이지.

## 개발

```bash
npm install
npm run dev   # http://localhost:3000
```

## 구조

- `src/app/` — 페이지 (Next.js App Router)
- `src/lib/games.ts` — 게임 목록. 게임을 추가하면 홈 화면에 카드로 노출됩니다.
- 각 게임 페이지는 `src/app/games/<slug>/page.tsx` 에 만듭니다.

## 스택

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
