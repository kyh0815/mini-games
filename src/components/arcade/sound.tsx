"use client";

import { useEffect } from "react";
import { Gear } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSoundSettings } from "@/hooks/use-sound";
import { audio } from "@/lib/audio";
import { LANGS, setLang, useLang, useT, type Lang } from "@/lib/i18n";

/** 첫 입력에서 오디오를 깨우고, 버튼 누르는 소리를 전역으로 붙입니다. */
export function SoundBoot() {
  useEffect(() => {
    const unlock = () => audio.unlock();
    const click = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest("button, a, [role='option'], [role='radio'], [role='slider']")) {
        audio.play("click");
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("pointerdown", click);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("pointerdown", click);
    };
  }, []);
  return null;
}

function OnOff({
  id,
  value,
  onChange,
}: {
  id: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = useT();
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-labelledby={id}
      value={value ? "on" : "off"}
      onValueChange={(next) => next && onChange(next === "on")}
    >
      <ToggleGroupItem value="on" className="h-8 min-w-12">
        {t("켬")}
      </ToggleGroupItem>
      <ToggleGroupItem value="off" className="h-8 min-w-12">
        {t("끔")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

/** 헤더의 설정 메뉴: 언어와 소리 */
export function SettingsControl() {
  const settings = useSoundSettings();
  const lang = useLang();
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("설정")}>
          <Gear />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="font-pixel fs-1 tracking-wide text-muted-foreground">LANGUAGE</p>
        <div className="flex items-center justify-between gap-3">
          <Label id="settings-lang">{t("언어")}</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            aria-labelledby="settings-lang"
            value={lang}
            onValueChange={(next) => next && setLang(next as Lang)}
          >
            {LANGS.map((l) => (
              <ToggleGroupItem key={l.value} value={l.value} lang={l.value} className="h-8 min-w-16">
                {l.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <p className="font-pixel mt-1 border-t-2 border-border pt-3 fs-1 tracking-wide text-muted-foreground">
          SOUND
        </p>
        <div className="flex items-center justify-between gap-3">
          <Label id="sound-music">{t("배경 음악")}</Label>
          <OnOff id="sound-music" value={settings.music} onChange={(music) => audio.update({ music })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label id="sound-sfx">{t("효과음")}</Label>
          <OnOff id="sound-sfx" value={settings.sfx} onChange={(sfx) => audio.update({ sfx })} />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Label id="sound-volume">{t("음량")}</Label>
            <span className="text-sm text-muted-foreground tabular-nums">
              {Math.round(settings.volume * 100)}
            </span>
          </div>
          <Slider
            aria-labelledby="sound-volume"
            min={0}
            max={1}
            step={0.05}
            value={[settings.volume]}
            onValueChange={([volume]) => audio.update({ volume })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
