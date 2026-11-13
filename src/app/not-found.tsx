import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <p className="font-pixel fs-6 text-foreground">404</p>
      <p className="text-sm text-muted-foreground">찾는 페이지가 없습니다.</p>
      <Button asChild>
        <Link href="/">로비로 돌아가기</Link>
      </Button>
    </main>
  );
}
