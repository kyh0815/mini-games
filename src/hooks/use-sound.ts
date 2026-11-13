"use client";

import { useSyncExternalStore } from "react";
import { audio, type SoundSettings } from "@/lib/audio";

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(audio.subscribe, audio.getSettings, audio.getServerSettings);
}
