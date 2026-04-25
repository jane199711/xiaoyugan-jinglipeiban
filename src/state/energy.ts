import type { CyclePhase, UserBaseline } from "./types";

export function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function roundToHalf(v: number) {
  return Math.round(v * 2) / 2;
}

export function assertValidDelta(delta: number) {
  if (delta === 0 || !Number.isFinite(delta)) throw new Error("delta 不合法");
  if (Math.round(delta * 2) !== delta * 2) throw new Error(`delta ${delta} 不是 0.5 的整数倍`);
}

export interface InitialEnergyResult {
  S_initial: number;
  phase: CyclePhase;
  P_cycle: number;
}

/** v3.0 八维度初始精力公式 → [6,10] */
export function calculateInitialEnergyV3(b: UserBaseline): InitialEnergyResult {
  const {
    base_energy: B,
    daily_load: O_weight,
    s_quality: S_quality,
    e_habit: E_habit,
    emo_score: EmoScore,
    last_period_start,
    cycle_days: T,
    period_days: M,
    skip_cycle,
  } = b;

  let P_cycle = 1.0;
  let phase: CyclePhase = "未追踪";
  if (!skip_cycle && last_period_start) {
    const today = new Date();
    const lastStart = new Date(last_period_start);
    if (lastStart <= today) {
      const D = Math.floor((+today - +lastStart) / 86_400_000) % T;
      if (D < M) { P_cycle = 0.8; phase = "月经期"; }
      else if (D < T / 2 - 2) { P_cycle = 1.1; phase = "卵泡期"; }
      else if (D < T / 2 + 2) { P_cycle = 1.2; phase = "排卵期"; }
      else { P_cycle = 0.7; phase = "黄体期"; }
    }
  }

  const B_norm = clamp((B - 4) / 6, 0, 1);
  const O_norm = clamp((O_weight - 0.7) / 0.3, 0, 1);
  const P_norm = clamp((P_cycle - 0.7) / 0.5, 0, 1);
  const S_norm = clamp((S_quality - 0.7) / 0.4, 0, 1);
  const E_norm = clamp((E_habit - 0.95) / 0.1, 0, 1);
  const Emo_norm = clamp((EmoScore - 0.8) / 0.3, 0, 1);

  const composite =
    B_norm * 0.30 + O_norm * 0.20 + P_norm * 0.20 +
    S_norm * 0.15 + E_norm * 0.05 + Emo_norm * 0.10;

  const S_initial = clamp(roundToHalf(6 + composite * 4), 6, 10);
  return { S_initial, phase, P_cycle };
}