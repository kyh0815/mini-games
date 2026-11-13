import { cn } from "@/lib/utils";

const COLORS = [
  "var(--neon-pink)",
  "var(--neon-cyan)",
  "var(--neon-yellow)",
  "var(--neon-green)",
  "oklch(0.75 0.19 300)",
  "oklch(0.8 0.17 55)",
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 플레이어 ID로 만드는 좌우 대칭 5×5 픽셀 캐릭터. 같은 사람은 항상 같은 모양입니다. */
export function PixelAvatar({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const color = COLORS[h % COLORS.length];
  const cells: [number, number][] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      if ((hash(`${seed}:${x}:${y}`) & 3) !== 0 || (x === 2 && y === 2)) {
        cells.push([x, y]);
        if (x < 2) cells.push([4 - x, y]);
      }
    }
  }
  return (
    <svg
      viewBox="0 0 7 7"
      aria-hidden
      shapeRendering="crispEdges"
      className={cn("size-9 shrink-0 border-2 border-ink bg-ink", className)}
    >
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x + 1} y={y + 1} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
