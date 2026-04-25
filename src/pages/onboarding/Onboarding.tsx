import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import catHero from "@/assets/cat-hero.png";
import fishFilled from "@/assets/fish-filled.png";
import fishOutline from "@/assets/fish-outline.png";
import type { UserBaseline, BaseEnergy, DailyLoad, SleepQuality, EmoScore } from "@/state/types";
import { calculateInitialEnergyV3 } from "@/state/energy";
import { KEYS, setItem, getTodayDateString } from "@/state/storage";

type Choice<T> = { label: string; desc: string; value: T };

const Q1: Choice<BaseEnergy>[] = [
  { label: "充电宝", desc: "续航极强,高压下依然能打", value: 10 },
  { label: "标准电池", desc: "正常作息下表现稳定,偶尔需要快充", value: 7 },
  { label: "易耗品", desc: "敏感细腻,能量像蒸气一样容易消散", value: 4 },
];
const Q3: Choice<DailyLoad>[] = [
  { label: "轻盈", desc: "专注简单,较少被打断或切换身份", value: 1.0 },
  { label: "切换", desc: "在职场、家庭、自我间高频跳转", value: 0.85 },
  { label: "磨损", desc: "核心工作是沟通、安抚或处理冲突", value: 0.7 },
];
const Q4: Choice<SleepQuality>[] = [
  { label: "睡很好 ✨", desc: "醒来感觉神清气爽", value: 1.1 },
  { label: "还行", desc: "基本够睡,没什么特别", value: 1.0 },
  { label: "没睡好", desc: "睡眠不足或睡了也累", value: 0.85 },
  { label: "几乎没睡 😔", desc: "熬夜/失眠/严重不足", value: 0.7 },
];
const EXERCISES = ["跑步/走路", "瑜伽/拉伸", "力量训练", "球类运动", "游泳", "基本不运动"];
const Q6: Choice<EmoScore>[] = [
  { label: "很好 ✨", desc: "状态积极,脑子灵光", value: 1.1 },
  { label: "还不错", desc: "平稳,没什么大起伏", value: 1.0 },
  { label: "有点低落", desc: "心里有点沉,不太有动力", value: 0.9 },
  { label: "很焦虑/很烦", desc: "情绪消耗大,脑子转不动", value: 0.8 },
];

interface Draft {
  base_energy?: BaseEnergy;
  last_period_start?: string;
  cycle_days: number;
  period_days: number;
  skip_cycle: boolean;
  daily_load?: DailyLoad;
  s_quality?: SleepQuality;
  exercises: string[];
  emo_score?: EmoScore;
  s_base: number;
}

const TOTAL_PAGES = 9; // 0=欢迎 + 1-8 + 结果

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>({
    cycle_days: 28,
    period_days: 5,
    skip_cycle: false,
    exercises: [],
    s_base: 8,
  });

  const skipAll = () => {
    const baseline: UserBaseline = {
      base_energy: 7,
      daily_load: 0.85,
      e_habit: 1.05,
      s_base: 8,
      emo_score: 1.0,
      s_quality: 1.0,
      cycle_days: 28,
      period_days: 5,
      skip_cycle: true,
      exercises: [],
      created_at: new Date().toISOString(),
    };
    setItem(KEYS.baseline, baseline);
    const date = getTodayDateString();
    setItem(KEYS.energyInitial(date), 8);
    setItem(KEYS.energyCurrent(date), 8);
    navigate("/");
  };

  const finalize = (): { baseline: UserBaseline; S_initial: number; phase: string } => {
    const baseline: UserBaseline = {
      base_energy: d.base_energy ?? 7,
      daily_load: d.daily_load ?? 0.85,
      s_quality: d.s_quality ?? 1.0,
      emo_score: d.emo_score ?? 1.0,
      e_habit: d.exercises.filter(e => e !== "基本不运动").length >= 1 ? 1.05 : 0.95,
      s_base: d.s_base,
      last_period_start: d.last_period_start ?? null,
      cycle_days: d.cycle_days,
      period_days: d.period_days,
      skip_cycle: d.skip_cycle,
      exercises: d.exercises,
      created_at: new Date().toISOString(),
    };
    const { S_initial, phase } = calculateInitialEnergyV3(baseline);
    return { baseline, S_initial, phase };
  };

  const enter = () => {
    const { baseline, S_initial } = finalize();
    setItem(KEYS.baseline, baseline);
    const date = getTodayDateString();
    setItem(KEYS.energyInitial(date), S_initial);
    setItem(KEYS.energyCurrent(date), S_initial);
    setItem(KEYS.lastOpenDate, date);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col px-5 py-8 max-w-md mx-auto">
      {/* 进度小鱼干 */}
      {step > 0 && step < 9 && (
        <div className="flex items-center justify-center gap-1.5 mb-6" aria-label={`第 ${step} 步,共 8 步`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <img
              key={i}
              src={i < step ? fishFilled : fishOutline}
              alt=""
              aria-hidden
              width={20}
              height={20}
              className="w-5 h-5"
              style={{ opacity: i < step ? 1 : 0.5 }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {step === 0 && <Welcome onStart={() => setStep(1)} onSkip={skipAll} />}

        {step === 1 && (
          <ChoicePage
            title="在这个世界上,你觉得自己更接近哪种能量体态?"
            options={Q1}
            value={d.base_energy}
            onChange={v => setD({ ...d, base_energy: v })}
            onNext={() => setStep(2)}
            disabled={d.base_energy === undefined}
          />
        )}

        {step === 2 && (
          <CyclePage
            d={d} setD={setD}
            onNext={() => setStep(3)}
            onSkip={() => { setD({ ...d, skip_cycle: true }); setStep(3); }}
          />
        )}

        {step === 3 && (
          <ChoicePage
            title="你的日常,是在以下哪种「浓度」中穿行?"
            options={Q3}
            value={d.daily_load}
            onChange={v => setD({ ...d, daily_load: v })}
            onNext={() => setStep(4)}
            disabled={d.daily_load === undefined}
          />
        )}

        {step === 4 && (
          <ChoicePage
            title="昨天睡得怎么样?"
            subtitle="这只反映今天的状态,不影响你的基础建模。"
            options={Q4}
            value={d.s_quality}
            onChange={v => setD({ ...d, s_quality: v })}
            onNext={() => setStep(5)}
            disabled={d.s_quality === undefined}
          />
        )}

        {step === 5 && (
          <ExercisePage
            value={d.exercises}
            onChange={v => setD({ ...d, exercises: v })}
            onNext={() => setStep(6)}
          />
        )}

        {step === 6 && (
          <ChoicePage
            title="你今天心情怎么样?"
            options={Q6}
            value={d.emo_score}
            onChange={v => setD({ ...d, emo_score: v })}
            onNext={() => setStep(7)}
            disabled={d.emo_score === undefined}
          />
        )}

        {step === 7 && (
          <SleepBasePage
            value={d.s_base}
            onChange={v => setD({ ...d, s_base: v })}
            onNext={() => setStep(8)}
          />
        )}

        {step === 8 && <Confirm d={d} onNext={() => setStep(9)} />}

        {step === 9 && <Result d={d} finalize={finalize} onEnter={enter} />}
      </div>
    </div>
  );
}

/* ---- 子页面 ---- */

function Welcome({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <img src={catHero} alt="陪伴小猫" width={220} height={220} className="w-48 h-48 animate-float drop-shadow-cat" />
      <h1 className="mt-4 text-2xl font-bold">欢迎来到小鱼干</h1>
      <p className="mt-4 text-sm leading-7 text-foreground/80 max-w-xs">
        我是你的陪伴小猫 🐱<br />
        在这里,我们用「小鱼干」来代表你的精力。<br />
        小鱼干越多,精力越充沛;越少,越需要休息。<br />
        来做个小小的能量体检,找到今天最真实的起点~
      </p>
      <Button size="lg" onClick={onStart} className="mt-10 w-full max-w-xs h-14 rounded-full text-base shadow-pillow">
        开始体检(共 8 步)
      </Button>
      <button onClick={onSkip} className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline">
        跳过,用默认值
      </button>
    </div>
  );
}

function ChoicePage<T>({
  title, subtitle, options, value, onChange, onNext, disabled,
}: {
  title: string; subtitle?: string;
  options: Choice<T>[]; value: T | undefined;
  onChange: (v: T) => void; onNext: () => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-xl font-semibold text-balance">{title}</h2>
      {subtitle && <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-6 space-y-3">
        {options.map(o => {
          const selected = value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all bg-gradient-card",
                selected
                  ? "border-primary shadow-pillow scale-[1.02]"
                  : "border-transparent hover:border-primary-soft"
              )}
            >
              <div className="font-semibold text-base">{o.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{o.desc}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-auto pt-8">
        <Button size="lg" onClick={onNext} disabled={disabled} className="w-full h-14 rounded-full text-base shadow-pillow">
          下一步
        </Button>
      </div>
    </div>
  );
}

function CyclePage({
  d, setD, onNext, onSkip,
}: { d: Draft; setD: (d: Draft) => void; onNext: () => void; onSkip: () => void }) {
  const error = d.period_days >= d.cycle_days ? "经期天数不能大于等于周期天数哦" : "";
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-xl font-semibold">我们想在你最脆弱的几天,给你自动「请假」。</h2>
      <p className="mt-2 text-xs text-muted-foreground">不知道也没关系,可以填大概的。</p>

      <div className="mt-6 space-y-6">
        <label className="block">
          <span className="text-sm font-medium">上一次月经起始日期</span>
          <Input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={d.last_period_start ?? ""}
            onChange={e => setD({ ...d, last_period_start: e.target.value })}
            className="mt-2 h-12 rounded-2xl"
          />
        </label>

        <div>
          <div className="flex justify-between text-sm font-medium">
            <span>平均周期天数</span>
            <span className="text-primary font-bold">{d.cycle_days} 天</span>
          </div>
          <Slider
            min={21} max={35} step={1}
            value={[d.cycle_days]}
            onValueChange={([v]) => setD({ ...d, cycle_days: v })}
            className="mt-3"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm font-medium">
            <span>经期天数</span>
            <span className="text-primary font-bold">{d.period_days} 天</span>
          </div>
          <Slider
            min={2} max={10} step={1}
            value={[d.period_days]}
            onValueChange={([v]) => setD({ ...d, period_days: v })}
            className="mt-3"
          />
        </div>

        {error && <p className="text-destructive text-xs">{error}</p>}
      </div>

      <div className="mt-auto pt-8 space-y-3">
        <Button size="lg" onClick={onNext} disabled={!!error || !d.last_period_start} className="w-full h-14 rounded-full shadow-pillow">
          下一步
        </Button>
        <button onClick={onSkip} className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline">
          跳过此步
        </button>
      </div>
    </div>
  );
}

function ExercisePage({
  value, onChange, onNext,
}: { value: string[]; onChange: (v: string[]) => void; onNext: () => void }) {
  const toggle = (e: string) => {
    if (value.includes(e)) onChange(value.filter(x => x !== e));
    else if (value.length < 3) onChange([...value, e]);
  };
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-xl font-semibold">平时会做什么运动?</h2>
      <p className="mt-2 text-xs text-muted-foreground">最多选 3 项。运动能帮你更好地储备和恢复精力~</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {EXERCISES.map(e => {
          const sel = value.includes(e);
          return (
            <button
              key={e}
              type="button"
              onClick={() => toggle(e)}
              className={cn(
                "p-4 rounded-2xl border-2 text-sm transition-all bg-gradient-card",
                sel ? "border-primary shadow-pillow" : "border-transparent"
              )}
            >
              {e}
            </button>
          );
        })}
      </div>
      <div className="mt-auto pt-8">
        <Button size="lg" onClick={onNext} className="w-full h-14 rounded-full shadow-pillow">下一步</Button>
      </div>
    </div>
  );
}

function SleepBasePage({
  value, onChange, onNext,
}: { value: number; onChange: (v: number) => void; onNext: () => void }) {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-xl font-semibold">睡多久,才能让你感到「活过来了」?</h2>
      <p className="mt-2 text-xs text-muted-foreground">这是你理想的睡眠时长,用来帮你判断睡眠差异。</p>
      <div className="mt-10 text-center">
        <div className="text-6xl font-bold text-primary">{value.toFixed(1)}<span className="text-2xl text-muted-foreground ml-1">h</span></div>
        <Slider
          min={4} max={10} step={0.5}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          className="mt-8"
        />
      </div>
      <div className="mt-auto pt-8">
        <Button size="lg" onClick={onNext} className="w-full h-14 rounded-full shadow-pillow">下一步</Button>
      </div>
    </div>
  );
}

function Confirm({ d, onNext }: { d: Draft; onNext: () => void }) {
  const labelOf = <T,>(opts: Choice<T>[], v: T | undefined) => opts.find(o => o.value === v)?.label ?? "未选";
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-xl font-semibold">我们了解了你现在的状态~</h2>
      <div className="mt-6 space-y-3 text-sm">
        <Row k="体质类型" v={labelOf(Q1, d.base_energy)} />
        <Row k="今天的负荷" v={labelOf(Q3, d.daily_load)} />
        <Row k="昨晚睡眠" v={labelOf(Q4, d.s_quality)} />
        <Row k="今天心情" v={labelOf(Q6, d.emo_score)} />
        <Row k="运动习惯" v={d.exercises.length === 0 ? "未填" : d.exercises.join("、")} />
        <Row k="理想睡眠" v={`${d.s_base.toFixed(1)} 小时`} />
      </div>
      <div className="mt-auto pt-8">
        <Button size="lg" onClick={onNext} className="w-full h-14 rounded-full shadow-pillow">完成,看看我的能量 →</Button>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-center p-3 rounded-xl bg-card/60 border border-border">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Result({
  d, finalize, onEnter,
}: { d: Draft; finalize: () => { baseline: UserBaseline; S_initial: number; phase: string }; onEnter: () => void }) {
  const { S_initial, phase } = finalize();
  const phaseLabel = phase === "未追踪" ? "未追踪周期" : phase;
  const sleepLabel = Q4.find(o => o.value === d.s_quality)?.label ?? "未追踪";
  const emoLabel = Q6.find(o => o.value === d.emo_score)?.label ?? "未追踪";
  const loadLabel = Q3.find(o => o.value === d.daily_load)?.label ?? "未追踪";

  return (
    <div className="flex flex-col flex-1 text-center">
      <h2 className="text-xl font-semibold">建模完成!</h2>
      <div className="mt-8">
        <div className="text-7xl font-bold text-primary">{S_initial}</div>
        <div className="text-sm text-muted-foreground mt-1">条小鱼干</div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-1.5 max-w-xs mx-auto">
        {Array.from({ length: 10 }).map((_, i) => (
          <img
            key={i}
            src={i < S_initial ? fishFilled : fishOutline}
            width={28} height={28}
            alt=""
            className="w-7 h-7"
            style={{ opacity: i < S_initial ? 1 : 0.45 }}
          />
        ))}
      </div>
      <p className="mt-8 text-sm leading-7 text-foreground/80 max-w-xs mx-auto">
        考虑到你今日处于<b className="text-primary"> {phaseLabel} </b>,面临<b> {loadLabel} </b>,
        昨晚<b> {sleepLabel} </b>,今天心情<b> {emoLabel} </b>,
        你的今日起始能量为 <b className="text-primary">{S_initial}</b> 条小鱼干。
      </p>
      {phase === "黄体期" && (
        <p className="mt-3 text-xs text-mint-foreground bg-mint/40 mx-auto inline-block px-3 py-1.5 rounded-full">
          正处于经前敏感期,已为你自动开启「减负模式」
        </p>
      )}
      <div className="mt-auto pt-8">
        <Button size="lg" onClick={onEnter} className="w-full h-14 rounded-full shadow-pillow">
          开启小鱼干 →
        </Button>
      </div>
    </div>
  );
}