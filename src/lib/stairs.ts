/** 계단 오르기의 난이도 곡선. 서버(패턴 생성)와 화면(체력 감소)이 함께 씁니다. */

/** 이만큼 오를 때마다 단계가 올라갑니다. */
export const STAGE_STEPS = 30;
/** 한 계단을 오르면 차는 체력 (전체가 1) */
export const STEP_GAIN = 0.14;

/** 1부터 시작하는 단계 */
export function stageOf(climbed: number): number {
  return Math.floor(Math.max(0, climbed) / STAGE_STEPS) + 1;
}

/**
 * 그 단계에서 체력을 유지하려면 1초에 올라야 하는 계단 수.
 * 단계가 바뀔 때마다 눈에 띄게 뛰고, 사람이 낼 수 있는 속도 근처에서 완만해집니다.
 */
const PACE = [1.5, 2.3, 3.1, 3.9, 4.6, 5.2, 5.8, 6.3, 6.8, 7.2];
export function paceOf(climbed: number): number {
  const stage = stageOf(climbed);
  if (stage <= PACE.length) return PACE[stage - 1];
  return Math.min(9, PACE[PACE.length - 1] + (stage - PACE.length) * 0.25);
}

/** 1ms 동안 줄어드는 체력 */
export function drainPerMs(climbed: number): number {
  return (paceOf(climbed) * STEP_GAIN) / 1000;
}
