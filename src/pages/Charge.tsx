import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Pause, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHARGE_ACTIVITIES, type ChargeActivity } from "@/state/categories";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import { BottomNav } from "@/components/xygui/BottomNav";
import { getItem, setItem, KEYS, getTodayDateString } from "@/state/storage";
import type { ChargeSession } from "@/state/achievements";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function pushSession(s: ChargeSession) {
  const d = getTodayDateString();
  const list = getItem<ChargeSession[]>(KEYS.chargeSessions(d)) ?? [];
  list.unshift(s);
  setItem(KEYS.chargeSessions(d), list);
}

function patchSession(id: string, patch: Partial<ChargeSession>) {
  const d = getTodayDateString();
  const list = (getItem<ChargeSession[]>(KEYS.chargeSessions(d)) ?? []).map(s =>
    s.id === id ? { ...s, ...patch } : s
  );
  setItem(KEYS.chargeSessions(d), list);
}

export default function Charge() {
  const { baseline } = useBaseline();
  const { state, update } = useEnergyToday(baseline);
  const [picked, setPicked] = useState<ChargeActivity | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 进行中的 session
  const [session, setSession] = useState<ChargeSession | null>(null);
  const [remaining, setRemaining] = useState(0); // 秒
  const tickRef = useRef<number | null>(null);

  const recommended = useMemo(() => {
    if (state.current >= 3) return CHARGE_ACTIVITIES;
    return CHARGE_ACTIVITIES.filter(a => a.energy_cost <= 1);
  }, [state.current]);

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  const startSession = () => {
    if (!picked) return;
    if (state.current - picked.energy_cost < 1.0) {
      toast.error("精力剩余不够启动这个充能活动哦,先休息一下吧~");
      setConfirmOpen(false);
      return;
    }
    update(-picked.energy_cost, "charge_start", { category: "充能", detail: picked.title });
    const s: ChargeSession = {
      id: uid(),
      activity_id: picked.id,
      activity_title: picked.title,
      cost: picked.energy_cost,
      gain: picked.energy_gain,
      status: "in_progress",
      started_at: new Date().toISOString(),
    };
    pushSession(s);
    setSession(s);
    setRemaining(picked.duration_min * 60);
    setConfirmOpen(false);
    tickRef.current = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);
  };

  const completeSession = () => {
    if (!session || !picked) return;
    if (tickRef.current) clearInterval(tickRef.current);
    update(picked.energy_gain, "charge_complete", { category: "充能", detail: picked.title });
    patchSession(session.id, { status: "completed", ended_at: new Date().toISOString() });
    toast.success(`充能完成!净增 ${(picked.energy_gain - picked.energy_cost).toFixed(1)} 条小鱼干 ✨`);
    setSession(null);
    setPicked(null);
  };

  const abandonSession = () => {
    if (!session) return;
    if (tickRef.current) clearInterval(tickRef.current);
    patchSession(session.id, { status: "abandoned", ended_at: new Date().toISOString() });
    toast("下次有状态了再来充能,保护好现有的小鱼干~");
    setSession(null);
    setPicked(null);
  };

  // —— 进行中:倒计时全屏
  if (session && picked) {
    const total = picked.duration_min * 60;
    const progress = 1 - remaining / total;
    const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
    const ss = (remaining % 60).toString().padStart(2, "0");
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 max-w-md mx-auto text-center">
        <div className="text-6xl mb-4">{picked.emoji}</div>
        <h2 className="text-xl font-bold">{picked.title}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">{picked.description}</p>

        <div className="relative w-56 h-56 my-10">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
            <circle
              cx="50" cy="50" r="45"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={283}
              strokeDashoffset={283 * (1 - progress)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold tabular-nums">{mm}:{ss}</div>
            <div className="text-xs text-muted-foreground mt-1">完成后 +{picked.energy_gain} 条</div>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <Button variant="outline" size="lg" onClick={abandonSession} className="flex-1 h-14 rounded-full">
            <Pause className="w-4 h-4 mr-1" /> 放弃
          </Button>
          <Button size="lg" onClick={completeSession} className="flex-1 h-14 rounded-full shadow-pillow">
            <Check className="w-4 h-4 mr-1" /> 完成了
          </Button>
        </div>
      </main>
    );
  }

  // —— 选择活动
  return (
    <main className="min-h-screen px-5 pt-6 pb-28 max-w-md mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">充能模式 ✨</h1>
        <span className="text-xs text-muted-foreground">当前 <b className="text-primary">{state.current.toFixed(1)}</b> 条</span>
      </header>
      <p className="mt-2 text-sm text-mint-foreground bg-mint/40 inline-block px-3 py-1.5 rounded-full">
        深度充能需要消耗一点精力,换来更大的恢复~
      </p>
      {state.current < 3 && (
        <p className="mt-3 text-xs text-destructive">
          精力较低,只显示低消耗的充能活动。
        </p>
      )}

      <div className="mt-5 space-y-3">
        {recommended.map(a => {
          const net = a.energy_gain - a.energy_cost;
          const sel = picked?.id === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setPicked(a)}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 bg-gradient-card transition-all",
                sel ? "border-primary shadow-pillow scale-[1.01]" : "border-transparent"
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.description}</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Tag>{a.duration_min} 分钟</Tag>
                    <Tag tone="warn">先扣 {a.energy_cost}</Tag>
                    <Tag tone="ok">恢复 {a.energy_gain}</Tag>
                    <Tag tone="primary">净增 {net.toFixed(1)} 🐟</Tag>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] px-5">
          <Button size="lg" onClick={() => setConfirmOpen(true)} className="w-full h-14 rounded-full shadow-pillow">
            开始充能 — {picked.title}
          </Button>
        </div>
      )}

      {confirmOpen && picked && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm grid place-items-center px-5" onClick={() => setConfirmOpen(false)}>
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-cat animate-bubble-in" onClick={e => e.stopPropagation()}>
            <div className="text-3xl text-center">{picked.emoji}</div>
            <h3 className="text-center font-bold text-lg mt-2">{picked.title}</h3>
            <p className="text-sm text-muted-foreground mt-3 text-center leading-relaxed">
              完成后精力 +{picked.energy_gain},现在先扣除 {picked.energy_cost} 条作为启动费<br />
              当前 <b>{state.current.toFixed(1)}</b> → 立即变 <b>{(state.current - picked.energy_cost).toFixed(1)}</b> → 完成后 <b className="text-primary">{Math.min(10, state.current - picked.energy_cost + picked.energy_gain).toFixed(1)}</b>
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" size="lg" className="flex-1 rounded-full" onClick={() => setConfirmOpen(false)}>再想想</Button>
              <Button size="lg" className="flex-1 rounded-full shadow-pillow" onClick={startSession}>确认开始</Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "ok" | "primary" }) {
  const map = {
    default: "bg-muted text-muted-foreground",
    warn: "bg-secondary text-secondary-foreground",
    ok: "bg-mint/40 text-mint-foreground",
    primary: "bg-primary-soft text-foreground",
  } as const;
  return <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", map[tone])}>{children}</span>;
}