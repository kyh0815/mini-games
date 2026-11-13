/** 화면 전체에 깔리는 오락실 배경: 네온 불빛, 바닥 격자, 브라운관 주사선 */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute -top-40 -left-40 size-[36rem] rounded-full bg-neon-pink/20 blur-[120px]" />
      <div className="absolute top-1/4 -right-48 size-[34rem] rounded-full bg-neon-cyan/15 blur-[120px]" />
      {/* 원근감 있는 바닥 격자. 지평선 쪽으로 갈수록 흐려집니다. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[34vh] overflow-hidden [perspective:300px]"
        style={{ maskImage: "linear-gradient(to bottom, transparent, black 70%)" }}
      >
        <div
          className="absolute inset-x-[-80%] bottom-0 h-[220%] origin-bottom animate-grid [transform:rotateX(64deg)]"
          style={{
            backgroundImage:
              "linear-gradient(to right, color-mix(in oklch, var(--neon-pink) 60%, transparent) 2px, transparent 2px), linear-gradient(to bottom, color-mix(in oklch, var(--neon-pink) 60%, transparent) 2px, transparent 2px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 3px, oklch(0 0 0 / 0.35) 3px 4px)",
        }}
      />
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_55%,oklch(0_0_0/0.55))]" />
    </div>
  );
}
