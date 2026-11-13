import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 사이트의 얼굴인 노란 게임기. 화면에 표정이 뜹니다.
 * 로고, 인트로, 빈 화면, 결과 화면에서 같은 그림을 씁니다.
 */
export type Mood = "smile" | "happy" | "wow" | "sad" | "sleep" | "oops";

/** 몸체 크기와 그 안에서 화면이 차지하는 자리(칸) */
export const BODY = { w: 24, h: 36 };
export const SCREEN = { x: 5, y: 5, w: 14, h: 11 };

const INK = "var(--ink)";
const FACE = "oklch(0.94 0.008 85)";

/** 화면(14×11칸) 안에 그리는 표정 */
export function MascotFace({ mood = "smile", blink = false }: { mood?: Mood; blink?: boolean }) {
  let eyes: ReactNode;
  let mouth: ReactNode;
  switch (mood) {
    case "happy":
      eyes = <path d="M2 4h1v1H2zM3 3h1v1H3zM4 4h1v1H4zM9 4h1v1H9zM10 3h1v1h-1zM11 4h1v1h-1z" />;
      mouth = <path d="M4 6h6v1H4zM5 7h4v1H5zM6 8h2v1H6z" />;
      break;
    case "wow":
      eyes = <path d="M2 2h2v2H2zM10 2h2v2h-2z" />;
      mouth = <path d="M6 6h2v3H6z" />;
      break;
    case "sad":
      eyes = <path d="M3 3h1v2H3zM10 3h1v2h-1z" />;
      mouth = <path d="M5 7h4v1H5zM4 8h1v1H4zM9 8h1v1H9z" />;
      break;
    case "sleep":
      eyes = <path d="M2 4h3v1H2zM9 4h3v1H9z" />;
      mouth = <path d="M6 7h2v1H6z" />;
      break;
    case "oops":
      eyes = (
        <path d="M2 2h1v1H2zM4 2h1v1H4zM3 3h1v1H3zM2 4h1v1H2zM4 4h1v1H4zM9 2h1v1H9zM11 2h1v1h-1zM10 3h1v1h-1zM9 4h1v1H9zM11 4h1v1h-1z" />
      );
      mouth = <path d="M5 8h4v1H5z" />;
      break;
    default:
      eyes = <path d="M3 3h1v2H3zM10 3h1v2h-1z" />;
      mouth = <path d="M4 7h1v1H4zM9 7h1v1H9zM5 8h4v1H5z" />;
  }
  return (
    <g fill={FACE}>
      <g className={blink ? "mascot-eyes" : undefined}>{eyes}</g>
      {mouth}
      {(mood === "smile" || mood === "happy" || mood === "wow") && (
        <path d="M1 6h1v1H1zM12 6h1v1h-1z" fill="var(--pop-pink)" />
      )}
    </g>
  );
}

/** 화면을 뺀 몸체. 인트로처럼 화면을 따로 덮어 그릴 때 씁니다. */
export function MascotBody() {
  return (
    <>
      <path d="M2 0h20v1h1v1h1v32h-1v1h-1v1H2v-1H1v-1H0V2h1V1h1z" fill={INK} />
      <path d="M2 1h20v1h1v32h-1v1H2v-1H1V2h1z" fill="var(--pop-yellow)" />
      {/* 오른쪽과 아래에 한 칸 그림자를 넣어 두께를 줍니다. */}
      <path d="M22 3h1v31h-1zM3 34h19v1H3z" fill="color-mix(in oklch, var(--pop-yellow) 72%, var(--ink))" />
      {/* 화면 테두리 */}
      <rect x="3" y="3" width="18" height="15" fill={INK} />
      {/* 십자 키 */}
      <path d="M5 23h2v-2h2v2h2v2H9v2H7v-2H5z" fill={INK} />
      {/* 버튼 */}
      <rect x="14" y="24" width="3" height="3" fill="var(--pop-red)" />
      <rect x="18" y="22" width="3" height="3" fill="var(--pop-blue)" />
      <path d="M14 24h3v1h-3zM18 22h3v1h-3z" fill="oklch(1 0 0 / 0.35)" />
      {/* 선택·시작 버튼과 스피커 */}
      <path d="M5 31h3v1H5zM9 31h3v1H9z" fill={INK} />
      <path d="M15 31h1v1h-1zM17 31h1v1h-1zM19 31h1v1h-1zM16 33h1v1h-1zM18 33h1v1h-1z" fill={INK} />
      <rect x="4" y="19" width="1" height="1" fill="var(--pop-green)" />
    </>
  );
}

export function Mascot({
  mood = "smile",
  blink = false,
  bob = false,
  className,
}: {
  mood?: Mood;
  /** 가끔 눈을 깜빡입니다. */
  blink?: boolean;
  /** 제자리에서 통통 움직입니다. */
  bob?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${BODY.w} ${BODY.h}`}
      aria-hidden
      shapeRendering="crispEdges"
      className={cn("w-16 shrink-0", bob && "mascot-bob", className)}
    >
      <MascotBody />
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill="oklch(0.172 0.012 265)" />
      <g transform={`translate(${SCREEN.x} ${SCREEN.y})`}>
        <MascotFace mood={mood} blink={blink} />
      </g>
    </svg>
  );
}

/** 로고에 쓰는 작은 표식: 얼굴이 뜬 게임기를 10×12칸으로 줄인 것 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 10 12" aria-hidden shapeRendering="crispEdges" className={cn("h-8 w-auto shrink-0", className)}>
      <rect width="10" height="12" fill="var(--pop-yellow)" />
      <rect x="1" y="1" width="8" height="6" fill={INK} />
      <path d="M3 3h1v1H3zM6 3h1v1H6zM4 5h2v1H4z" fill={FACE} />
      <path d="M2 8h1v3H2zM1 9h3v1H1z" fill={INK} />
      <rect x="6" y="9" width="1" height="1" fill="var(--pop-red)" />
      <rect x="8" y="8" width="1" height="1" fill="var(--pop-blue)" />
    </svg>
  );
}
