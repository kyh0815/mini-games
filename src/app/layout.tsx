import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";
import { Footer } from "@/components/arcade/footer";
import { Header } from "@/components/arcade/header";
import { Intro } from "@/components/arcade/intro";
import { LangBoot } from "@/components/arcade/lang-boot";
import { NicknameDialog } from "@/components/arcade/nickname";
import { SoundBoot } from "@/components/arcade/sound";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// 제목·숫자용 한글 픽셀 폰트 (Galmuri11, SIL OFL 1.1)
const galmuri = localFont({
  src: "../../node_modules/galmuri/dist/Galmuri11.woff2",
  variable: "--font-galmuri",
  display: "swap",
});

const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: { default: "MINI GAME HEAVEN | 미니게임 천국", template: "%s | MINI GAME HEAVEN" },
  description: "팀원들과 함께 즐기는 미니게임 천국. 방을 만들어 함께하거나, 혼자 기록에 도전하세요.",
};

export const viewport: Viewport = { themeColor: "#1b1c22", colorScheme: "dark" };

/**
 * 첫 그리기 전에 실행됩니다.
 * - 일본어를 골라 둔 사람이면, 언어가 적용될 때까지 화면을 잠깐 가립니다.
 * - 이번 방문에서 인트로를 아직 안 봤으면(그리고 움직임 줄이기를 켜 두지 않았으면) 인트로를 켭니다.
 */
const BOOT = `try{var d=document.documentElement;if(localStorage.getItem("mg_lang")==="ja"){d.lang="ja";d.classList.add("lang-wait")}if(!sessionStorage.getItem("mg_intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.dataset.intro="1"}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning className={`dark h-full antialiased ${galmuri.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <Intro />
        <TooltipProvider delayDuration={200}>
          <Header />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
          <NicknameDialog />
        </TooltipProvider>
        <Toaster />
        <SoundBoot />
        <LangBoot />
      </body>
    </html>
  );
}
