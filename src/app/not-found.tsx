import Link from "next/link";
import { Blink } from "@/components/arcade/panel";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p className="font-pixel fs-6 text-neon-red neon-text">404</p>
      <Blink className="fs-2 text-foreground">GAME OVER</Blink>
      <p className="text-sm text-muted-foreground">찾는 페이지가 없습니다.</p>
      <Button asChild variant="coin">
        <Link href="/">CONTINUE?</Link>
      </Button>
    </main>
  );
}
