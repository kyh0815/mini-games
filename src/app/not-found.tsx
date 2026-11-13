"use client";

import Link from "next/link";
import { Mascot } from "@/components/arcade/mascot";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const t = useT();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <Mascot mood="oops" className="w-20" />
      <p className="font-pixel fs-6 text-foreground">404</p>
      <p className="text-sm text-muted-foreground">{t("찾는 페이지가 없습니다.")}</p>
      <Button asChild>
        <Link href="/">{t("로비로 돌아가기")}</Link>
      </Button>
    </main>
  );
}
