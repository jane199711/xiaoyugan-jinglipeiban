import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BottomNav } from "@/components/xygui/BottomNav";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import { supabase } from "@/integrations/supabase/client";
import { getItem, setItem, KEYS, getTodayDateString } from "@/state/storage";
import { getTodayChargeSessions } from "@/state/achievements";
import { calculateInitialEnergyV3 } from "@/state/energy";
import catHero from "@/assets/cat-hero.png";
import { toast } from "sonner";

export default function Report() {
  const { baseline } = useBaseline();
  const { state } = useEnergyToday(baseline);
  const date = getTodayDateString();
  const [content, setContent] = useState<string | null>(() => getItem<string>(KEYS.dailyReport(date)));
  const [loading, setLoading] = useState(false);

  const stats = {
    avg: state.records.length ? state.records.reduce((s, r) => s + r.energy_score, 0) / state.records.length : state.current,
    min: state.records.length ? Math.min(...state.records.map(r => r.energy_score)) : state.current,
    max: state.records.length ? Math.max(...state.records.map(r => r.energy_score)) : state.current,
    count: state.records.length,
  };

  const generate = async () => {
    if (loading) return;
    if (state.records.length === 0) {
      toast("今天还没有任何记录哦,先去首页记一笔吧~");
      return;
    }
    setLoading(true);
    try {
      const phase = baseline ? calculateInitialEnergyV3(baseline).phase : "未追踪";
      const charges = getTodayChargeSessions().map(s => ({
        activity: s.activity_title, cost: s.cost, gain: s.gain, status: s.status === "completed" ? "completed" : "abandoned",
      }));
      const blindBoxes = getItem<unknown[]>(KEYS.blindBox(date)) ?? [];
      const { data, error } = await supabase.functions.invoke("daily-report", {
        body: {
          date,
          records: state.records.map(r => ({
            timestamp: r.timestamp, energy_score: r.energy_score, score_change: r.score_change,
            event_category: r.event_category, event_detail: r.event_detail,
          })),
          blind_box_count: blindBoxes.length,
          charge_sessions: charges,
          phase,
        },
      });
      if (error) throw error;
      const text = (data as { content?: string })?.content;
      if (text) {
        setContent(text);
        setItem(KEYS.dailyReport(date), text);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("402")) toast.error("AI 额度不够,请到 Settings → Workspace → Usage 充值");
      else toast.error("日报生成失败,稍后再试~");
    } finally {
      setLoading(false);
    }
  };

  // 当日有 ≥3 条记录且没生成过时,自动生成一次
  useEffect(() => {
    if (!content && state.records.length >= 3) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen px-5 pt-6 pb-28 max-w-md mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        今日日报 <Sparkles className="w-5 h-5 text-primary" />
      </h1>
      <p className="mt-1 text-xs text-muted-foreground">{date}</p>

      {/* 数据卡片 */}
      <section className="mt-5 grid grid-cols-4 gap-2">
        <Stat label="当前" value={state.current.toFixed(1)} />
        <Stat label="平均" value={stats.avg.toFixed(1)} />
        <Stat label="最高" value={stats.max.toFixed(1)} />
        <Stat label="最低" value={stats.min.toFixed(1)} />
      </section>

      {/* AI 日报正文 */}
      <section className="mt-6">
        {content ? (
          <article className="bg-gradient-card border border-border rounded-3xl p-5 shadow-soft animate-bubble-in">
            <div className="flex items-center gap-2 mb-3">
              <img src={catHero} alt="" width={32} height={32} className="w-8 h-8 rounded-full" />
              <span className="text-sm font-medium">小猫写给你的</span>
            </div>
            <div className="prose prose-sm max-w-none text-foreground/90 prose-p:leading-7">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </article>
        ) : (
          <div className="bg-card/60 border border-dashed border-border rounded-3xl p-6 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {state.records.length === 0
                ? "今天还没有记录,先去首页和小猫聊聊精力变化吧~"
                : "今天小猫还没给你写日报呢"}
            </p>
            <Button
              size="lg"
              onClick={generate}
              disabled={loading || state.records.length === 0}
              className="mt-4 rounded-full shadow-pillow"
            >
              {loading ? "小猫正在写…" : "请小猫写今日日报 ✨"}
            </Button>
          </div>
        )}
        {content && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={generate} disabled={loading} className="text-xs">
              {loading ? "重新写中…" : "让小猫重新写一份 🔄"}
            </Button>
          </div>
        )}
      </section>

      {/* 今日记录列表 */}
      {state.records.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted-foreground">今日记录(最近 {Math.min(state.records.length, 10)} 条)</h2>
          <ul className="mt-3 space-y-2">
            {state.records.slice(0, 10).map(r => (
              <li key={r.id} className="flex items-center justify-between bg-card/70 border border-border rounded-2xl px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold ${r.score_change > 0 ? "text-primary" : "text-muted-foreground"}`}>
                    {r.score_change > 0 ? "+" : ""}{r.score_change}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {r.event_category ?? (r.source === "longpress" ? "快速调整" : "单击")}
                    {r.event_detail ? ` · ${r.event_detail}` : ""}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                  {new Date(r.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomNav />
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gradient-card rounded-2xl p-3 text-center border border-border">
      <div className="text-xl font-bold text-primary tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}