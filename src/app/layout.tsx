import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Backdrop } from "@/components/arcade/backdrop";
import { Header } from "@/components/arcade/header";
import { SoundBoot } from "@/components/arcade/sound";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// 제목·버튼용 한글 픽셀 폰트 (Galmuri11, SIL OFL 1.1)
const galmuri = localFont({
  src: "../../node_modules/galmuri/dist/Galmuri11.woff2",
  variable: "--font-galmuri",
  display: "swap",
});

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "MINI ARCADE | 미니게임 오락실", template: "%s | MINI ARCADE" },
  description: "팀원들과 함께 즐기는 실시간 미니게임 오락실. 방을 만들고 링크를 공유하세요.",
};

export const viewport: Viewport = { themeColor: "#0d0a1c", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`dark h-full antialiased ${galmuri.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-full flex-col">
        <Backdrop />
        <TooltipProvider delayDuration={200}>
          <Header />
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="font-pixel px-4 py-6 text-center fs-1 text-muted-foreground/70">
            © MINI ARCADE · PRESS START TO PLAY
          </footer>
        </TooltipProvider>
        <Toaster />
        <SoundBoot />
      </body>
    </html>
  );
}
