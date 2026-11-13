"use client";

import { useEffect } from "react";
import { useLang } from "@/lib/i18n";

/** 고른 언어가 화면에 적용되면 문서의 언어 표시를 맞추고, 가려 두었던 화면을 보여 줍니다. */
export function LangBoot() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.classList.remove("lang-wait");
  }, [lang]);
  return null;
}
