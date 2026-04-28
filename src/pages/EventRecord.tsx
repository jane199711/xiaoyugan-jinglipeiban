import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { ADD_CATEGORIES, SUBTRACT_CATEGORIES } from "@/state/categories";
import { useBaseline, useEnergyToday } from "@/state/useEnergy";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** /event/add 或 /event/subtract — 双击 +/- 后进入 */
export default function EventRecord() {
  const { type } = useParams<{ type: "add" | "subtract" }>();
  const navigate = useNavigate();
  const isAdd = type === "add";
  const cats = isAdd ? ADD_CATEGORIES : SUBTRACT_CATEGORIES;
  const { baseline } = useBaseline();
  const { state, update } = useEnergyToday(baseline);

  const [picked, setPicked] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  // 用户自由选择数值,正负由按钮类型决定
  // 默认 0.5,可在 0.5 ~ 10 之间以 0.5 为步进
  const [magnitude, setMagnitude] = useState<number>(0.5);
  const signed = useMemo(() => (isAdd ? magnitude : -magnitude), [isAdd, magnitude]);

  // 预测应用后的精力(限制 0~10)
  const projected = useMemo(() => {
    const next = Math.max(0, Math.min(10, state.current + signed));
    return next;
  }, [state.current, signed]);

  const stepDown = () => setMagnitude(m => Math.max(0.5, +(m - 0.5).toFixed(1)));
  const stepUp = () => setMagnitude(m => Math.min(10, +(m + 0.5).toFixed(1)));

  const submit = () => {
    if (!picked) return;
    update(signed, "detail", { category: picked, detail: detail.trim() || undefined });
    toast.success(
      isAdd ? `记录 +${magnitude} 条 🐟` : `记录 -${magnitude} 条 🌧️`
    );
    navigate("/");
  };

  const presets = [0.5, 1, 2, 3, 5];

  return (
    <main className="min-h-screen px-5 pt-6 pb-32 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <h1 className="text-2xl font-bold">
        {isAdd ? "是什么让你充电了?" : "是什么消耗了你?"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        选一个最贴近的大类,告诉小猫一下~ {isAdd ? "可以是任何让你回血的小事。" : "不是为了责怪自己,只是看看自己流向哪里。"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {cats.map(c => {
          const sel = picked === c.label;
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => setPicked(c.label)}
              className={cn(
                "aspect-square rounded-3xl border-2 transition-all bg-gradient-card flex flex-col items-center justify-center gap-1.5 p-2",
                sel ? "border-primary shadow-pillow scale-[1.04]" : "border-transparent hover:border-primary-soft"
              )}
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-[11px] font-medium text-center leading-tight">{c.label}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="mt-6 animate-bubble-in space-y-5">
          {/* 数值选择 */}
          <div className="rounded-3xl bg-gradient-card border border-primary-soft/40 p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isAdd ? "回血了多少?" : "消耗了多少?"}
              </span>
              <span className="text-xs text-muted-foreground">
                范围 0.5 ~ 10 · 步进 0.5
              </span>
            </div>

            <div className="mt-4 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={stepDown}
                disabled={magnitude <= 0.5}
                className="w-12 h-12 rounded-full grid place-items-center bg-secondary text-secondary-foreground shadow-soft active:scale-95 disabled:opacity-40"
                aria-label="减少 0.5"
              >
                <Minus className="w-5 h-5" strokeWidth={3} />
              </button>
              <div className="min-w-[120px] text-center">
                <div className={cn(
                  "text-4xl font-bold tabular-nums",
                  isAdd ? "text-primary" : "text-foreground"
                )}>
                  {isAdd ? "+" : "−"}{magnitude}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">条小鱼干</div>
              </div>
              <button
                type="button"
                onClick={stepUp}
                disabled={magnitude >= 10}
                className="w-12 h-12 rounded-full grid place-items-center bg-primary text-primary-foreground shadow-soft active:scale-95 disabled:opacity-40"
                aria-label="增加 0.5"
              >
                <Plus className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>

            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={magnitude}
              onChange={e => setMagnitude(parseFloat(e.target.value))}
              className="mt-5 w-full accent-primary"
              aria-label="数值滑块"
            />

            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {presets.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMagnitude(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition",
                    magnitude === p
                      ? "bg-primary text-primary-foreground border-primary shadow-soft"
                      : "bg-background border-border text-muted-foreground hover:border-primary-soft"
                  )}
                >
                  {isAdd ? "+" : "−"}{p}
                </button>
              ))}
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              当前 <b className="text-foreground">{state.current.toFixed(1)}</b>
              <span className="mx-1.5">→</span>
              记录后 <b className={cn(isAdd ? "text-primary" : "text-foreground")}>{projected.toFixed(1)}</b>
              {(state.current + signed > 10 || state.current + signed < 0) && (
                <span className="ml-2 text-[10px] text-muted-foreground">(已封顶)</span>
              )}
            </div>
          </div>

          {/* 详情 */}
          <div>
            <label className="text-sm font-medium">具体是什么?(可选)</label>
            <Textarea
              value={detail}
              onChange={e => setDetail(e.target.value.slice(0, 80))}
              placeholder={isAdd ? "说说是什么让你有能量的~" : "说说是什么让你累了~"}
              className="mt-2 rounded-2xl resize-none"
              rows={2}
            />
            <div className="text-xs text-muted-foreground text-right mt-1">{detail.length}/80</div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(92vw,420px)] px-5">
        <Button
          size="lg"
          disabled={!picked}
          onClick={submit}
          className="w-full h-14 rounded-full text-base shadow-pillow"
        >
          {isAdd ? `记录 +${magnitude} 条` : `记录 -${magnitude} 条`}
        </Button>
      </div>
    </main>
  );
}