/**
 * 오락실 사운드. 음원 파일 없이 Web Audio로 직접 합성합니다.
 * - BGM: 8마디짜리 칩튠 루프 (리드 / 아르페지오 / 베이스 / 드럼)
 * - 효과음: 버튼, 정답, 오답, 카운트다운 등
 */

export type SoundSettings = { music: boolean; sfx: boolean; volume: number };
export type Sfx =
  | "click"
  | "coin"
  | "join"
  | "start"
  | "correct"
  | "wrong"
  | "tick"
  | "go"
  | "turn"
  | "blip"
  | "win"
  | "lose";
export type Mood = "lobby" | "play";

const STORAGE_KEY = "mg:sound";
const DEFAULTS: SoundSettings = { music: true, sfx: true, volume: 0.4 };

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440 */
function hz(note: string): number {
  const octave = Number(note.slice(-1));
  const name = note.slice(0, -1);
  const semi = SEMITONE[name[0]] + (name[1] === "#" ? 1 : 0);
  return 440 * 2 ** ((semi - 9) / 12 + (octave - 4));
}

type Hit = [step: number, note: string, length: number];

// 한 마디 = 16스텝. 진행: Am F C G | Am F G Am
const CHORDS: [bass: string, arp: string[]][] = [
  ["A2", ["A3", "C4", "E4", "A4"]],
  ["F2", ["F3", "A3", "C4", "F4"]],
  ["C3", ["C4", "E4", "G4", "C5"]],
  ["G2", ["G3", "B3", "D4", "G4"]],
  ["A2", ["A3", "C4", "E4", "A4"]],
  ["F2", ["F3", "A3", "C4", "F4"]],
  ["G2", ["G3", "B3", "D4", "G4"]],
  ["A2", ["A3", "E4", "A4", "C5"]],
];

const LEAD: Hit[][] = [
  [[0, "E5", 2], [2, "A5", 2], [4, "G5", 1], [5, "E5", 3], [8, "C5", 2], [10, "D5", 2], [12, "E5", 4]],
  [[0, "F5", 2], [2, "A5", 2], [4, "G5", 1], [5, "F5", 3], [8, "C5", 2], [10, "F5", 2], [12, "A5", 4]],
  [[0, "G5", 2], [2, "E5", 2], [4, "C5", 2], [6, "E5", 2], [8, "G5", 3], [11, "C6", 3], [14, "G5", 2]],
  [[0, "D5", 2], [2, "G5", 2], [4, "B5", 2], [6, "A5", 2], [8, "G5", 4], [12, "D5", 2], [14, "B4", 2]],
  [[0, "A5", 3], [3, "E5", 3], [6, "A5", 2], [8, "C6", 2], [10, "B5", 2], [12, "A5", 2], [14, "E5", 2]],
  [[0, "F5", 3], [3, "C5", 3], [6, "F5", 2], [8, "A5", 2], [10, "G5", 2], [12, "F5", 2], [14, "C5", 2]],
  [[0, "G5", 2], [2, "B5", 2], [4, "D6", 4], [8, "B5", 2], [10, "G5", 2], [12, "A5", 2], [14, "B5", 2]],
  [[0, "A5", 6], [6, "E5", 2], [8, "A5", 3], [12, "C6", 1], [13, "B5", 1], [14, "A5", 2]],
];

const STEPS_PER_BAR = 16;
const TOTAL_STEPS = STEPS_PER_BAR * CHORDS.length;
const BPM: Record<Mood, number> = { lobby: 112, play: 136 };

class ArcadeAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private mood: Mood = "lobby";
  private settings: SoundSettings = DEFAULTS;
  private loaded = false;
  private listeners = new Set<() => void>();

  // ----- 설정 (useSyncExternalStore 용) -----

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getSettings = (): SoundSettings => {
    if (!this.loaded && typeof window !== "undefined") {
      this.loaded = true;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) this.settings = { ...DEFAULTS, ...JSON.parse(raw) };
      } catch {
        // 저장된 값을 못 읽으면 기본값을 씁니다.
      }
    }
    return this.settings;
  };

  getServerSettings = (): SoundSettings => DEFAULTS;

  update(patch: Partial<SoundSettings>): void {
    this.settings = { ...this.getSettings(), ...patch };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // 저장하지 못해도 이번 접속에는 적용됩니다.
    }
    this.apply();
    this.listeners.forEach((fn) => fn());
  }

  // ----- 재생 제어 -----

  private unlockQueued = false;

  /**
   * 브라우저 정책상 첫 클릭/키 입력 뒤에만 소리를 낼 수 있습니다.
   * 오디오 장치를 여는 데 0.1초 넘게 걸릴 수 있어, 그 클릭의 처리를 막지 않도록 잠시 뒤에 엽니다.
   */
  unlock(): void {
    if (typeof window === "undefined" || this.ctx || this.unlockQueued) {
      if (this.ctx?.state === "suspended") void this.ctx.resume();
      return;
    }
    this.unlockQueued = true;
    setTimeout(() => {
      this.unlockQueued = false;
      this.open();
    }, 250);
  }

  private open(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(ctx.destination);
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buffer;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    this.apply();
  }

  setMood(mood: Mood): void {
    this.mood = mood;
  }

  private apply(): void {
    const s = this.getSettings();
    if (!this.ctx || !this.master || !this.musicBus || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.volume, now, 0.03);
    this.musicBus.gain.setTargetAtTime(s.music ? 0.5 : 0, now, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx ? 1 : 0, now, 0.03);
    if (s.music && !this.timer) {
      this.nextTime = now + 0.08;
      this.timer = setInterval(() => this.schedule(), 25);
    } else if (!s.music && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // ----- 합성 -----

  private tone(
    bus: GainNode,
    type: OscillatorType,
    freq: number,
    at: number,
    duration: number,
    gain: number,
    slideTo?: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, at);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.linearRampToValueAtTime(gain, at + 0.005);
    amp.gain.setValueAtTime(gain, at + Math.max(0.006, duration - 0.03));
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(amp).connect(bus);
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }

  private hiss(bus: GainNode, at: number, duration: number, gain: number, highpass: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, at);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter).connect(amp).connect(bus);
    src.start(at);
    src.stop(at + duration + 0.02);
  }

  /** 조금 앞선 시각까지 미리 예약해 타이머 지연에도 박자가 흔들리지 않게 합니다. */
  private schedule(): void {
    const ctx = this.ctx;
    const bus = this.musicBus;
    if (!ctx || !bus) return;
    // 탭이 오래 숨겨졌다 돌아오면 밀린 음을 한꺼번에 내지 않도록 현재 시각으로 맞춥니다.
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const stepTime = 60 / BPM[this.mood] / 4;
      this.playStep(bus, this.step, this.nextTime, stepTime);
      this.step = (this.step + 1) % TOTAL_STEPS;
      this.nextTime += stepTime;
    }
  }

  private playStep(bus: GainNode, step: number, at: number, stepTime: number): void {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const s = step % STEPS_PER_BAR;
    const [bass, arp] = CHORDS[bar];

    for (const [start, note, length] of LEAD[bar]) {
      if (start === s) this.tone(bus, "square", hz(note), at, stepTime * length * 0.92, 0.075);
    }
    this.tone(bus, "square", hz(arp[s % 4]), at, stepTime * 0.8, 0.022);
    if (s % 2 === 0) {
      // 8분음표 베이스: 세 번째와 여섯 번째, 여덟 번째는 한 옥타브 위
      const up = s === 4 || s === 10 || s === 14;
      this.tone(bus, "triangle", hz(bass) * (up ? 2 : 1), at, stepTime * 1.7, 0.2);
    }
    if (s === 0 || s === 8 || (bar % 2 === 1 && s === 6)) {
      this.tone(bus, "sine", 150, at, 0.12, 0.3, 45);
    }
    if (s === 4 || s === 12) this.hiss(bus, at, 0.11, 0.1, 1500);
    if (s % 2 === 1) this.hiss(bus, at, 0.03, 0.035, 7000);
  }

  play(name: Sfx): void {
    const ctx = this.ctx;
    const bus = this.sfxBus;
    if (!ctx || !bus || ctx.state !== "running" || !this.getSettings().sfx) return;
    const t = ctx.currentTime + 0.005;
    const seq = (notes: string[], gap: number, len: number, gain = 0.14, type: OscillatorType = "square") =>
      notes.forEach((n, i) => this.tone(bus, type, hz(n), t + i * gap, len, gain));
    switch (name) {
      case "click":
        this.tone(bus, "square", 660, t, 0.04, 0.08);
        break;
      case "blip":
        this.tone(bus, "square", 880, t, 0.05, 0.1);
        break;
      case "coin":
        seq(["B5", "E6"], 0.07, 0.22, 0.13);
        break;
      case "join":
        seq(["E5", "A5"], 0.08, 0.1, 0.11);
        break;
      case "start":
        seq(["C5", "E5", "G5", "C6"], 0.08, 0.12, 0.13);
        break;
      case "correct":
        seq(["E5", "G5", "C6", "E6"], 0.06, 0.12, 0.13);
        break;
      case "wrong":
        this.tone(bus, "sawtooth", 196, t, 0.16, 0.13, 110);
        this.tone(bus, "sawtooth", 110, t + 0.16, 0.22, 0.13, 70);
        break;
      case "tick":
        this.tone(bus, "square", 1040, t, 0.05, 0.09);
        break;
      case "go":
        this.tone(bus, "square", 1568, t, 0.35, 0.12);
        break;
      case "turn":
        seq(["G5", "C6"], 0.09, 0.12, 0.13, "triangle");
        break;
      case "win":
        seq(["C5", "E5", "G5", "C6", "G5", "C6", "E6"], 0.1, 0.16, 0.14);
        break;
      case "lose":
        seq(["E5", "D5", "C5", "A4"], 0.16, 0.2, 0.12, "triangle");
        break;
    }
  }
}

export const audio = new ArcadeAudio();
