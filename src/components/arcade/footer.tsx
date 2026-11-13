import Link from "next/link";
import { BrandMark } from "./mascot";

const REPO = "https://github.com/kyh0815/mini-games";

/** 모든 화면 맨 아래의 띠. 본문과 구분되도록 한 단계 어둡게 깔고 위에 선을 긋습니다. */
export function Footer() {
  return (
    <footer className="mt-10 border-t-2 border-ink bg-inset">
      <div className="font-pixel mx-auto flex min-h-12 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-3 fs-1 tracking-wide text-muted-foreground sm:px-6">
        <p className="flex items-center gap-2">
          <BrandMark className="h-5" />
          <span>© 2026 MINI GAME HEAVEN</span>
        </p>
        <p className="flex items-center gap-3">
          <Link
            href="/updates"
            className="underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            UPDATES
          </Link>
          <span aria-hidden className="size-1 bg-border" />
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            GitHub
          </a>
          <span aria-hidden className="size-1 bg-border" />
          <span>Made by kyh</span>
        </p>
      </div>
    </footer>
  );
}
