import { cn } from "@/lib/utils";
import { PixelAvatar } from "./pixel-avatar";

/** 8×8 픽셀 캐릭터. 글자 하나가 한 칸의 색입니다. */
const PALETTE: Record<string, string> = {
  k: "var(--ink)",
  w: "oklch(0.96 0.01 85)",
  o: "var(--pop-orange)",
  b: "var(--pop-blue)",
  v: "var(--pop-violet)",
  g: "var(--pop-green)",
  y: "var(--pop-yellow)",
  t: "var(--pop-teal)",
  p: "var(--pop-pink)",
  r: "var(--pop-red)",
};

export type Character = { id: string; name: string; rows: string[] };

export const CHARACTERS: Character[] = [
  {
    id: "cat",
    name: "고양이",
    rows: ["o.....o.", "oo...oo.", "ooooooo.", "okoookoo", "ooooooo.", "oowwwoo.", ".ooooo..", ".o...o.."],
  },
  {
    id: "robot",
    name: "로봇",
    rows: ["...rr...", "...bb...", ".bbbbbb.", ".bwkbwk.", ".bbbbbb.", "bbkkkkbb", ".bbbbbb.", ".bb..bb."],
  },
  {
    id: "ghost",
    name: "유령",
    rows: ["..vvvv..", ".vvvvvv.", "vwkvvwkv", "vwkvvwkv", "vvvvvvvv", "vvvvvvvv", "vvvvvvvv", "v.vv.vv."],
  },
  {
    id: "frog",
    name: "개구리",
    rows: [".ww..ww.", "gwkggwkg", "gggggggg", "gggggggg", "gkkkkkkg", ".gggggg.", "gg.gg.gg", "g..gg..g"],
  },
  {
    id: "chick",
    name: "병아리",
    rows: ["..yyyy..", ".yyyyyy.", ".ykyyky.", ".yyooyy.", "yyyyyyyy", "yyyyyyyy", ".yyyyyy.", "..o..o.."],
  },
  {
    id: "slime",
    name: "슬라임",
    rows: ["........", "...tt...", "..tttt..", ".tttttt.", "ttkttktt", "tttttttt", "tttkkttt", ".tttttt."],
  },
  {
    id: "invader",
    name: "외계인",
    rows: ["..p..p..", ".pppppp.", "ppkppkpp", "pppppppp", "pppppppp", ".p.pp.p.", "p......p", ".p....p."],
  },
];

/** 고른 캐릭터를 그립니다. id가 "me"이거나 없는 캐릭터면 그 사람의 기본 아바타를 씁니다. */
export function Sprite({
  id,
  seed,
  className,
}: {
  id: string;
  seed: string;
  className?: string;
}) {
  const character = CHARACTERS.find((c) => c.id === id);
  if (!character) return <PixelAvatar seed={seed} className={cn("border-0 bg-transparent", className)} />;
  return (
    <svg viewBox="0 0 8 8" aria-hidden shapeRendering="crispEdges" className={cn("size-9 shrink-0", className)}>
      {character.rows.flatMap((row, y) =>
        Array.from(row).map((cell, x) =>
          cell === "." ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={PALETTE[cell]} />
          ),
        ),
      )}
    </svg>
  );
}
