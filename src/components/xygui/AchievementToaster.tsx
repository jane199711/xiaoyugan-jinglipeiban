import { useEffect, useRef, useState } from "react";
import type { Achievement } from "@/state/achievements";
import { cn } from "@/lib/utils";

/** 成就弹窗队列:逐个显示,4 秒后自动关闭,300ms 间隔显示下一个 */
const DISPLAY_MS = 4000;
const GAP_MS = 300;

interface ToasterProps {
  newAchievements: Achievement[]; // 受控:外部 push 进来
  onConsumed: () => void;         // 一次性消费完后回调
}

export function AchievementToaster({ newAchievements, onConsumed }: ToasterProps) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);
  const isShowing = useRef(false);

  // 接收新成就
  useEffect(() => {
    if (newAchievements.length > 0) {
      setQueue(q => [...q, ...newAchievements]);
      onConsumed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newAchievements]);

  // 队列驱动
  useEffect(() => {
    if (current || queue.length === 0 || isShowing.current) return;
    isShowing.current = true;
    const next = queue[0];
    setQueue(q => q.slice(1));
    setCurrent(next);
    const t = window.setTimeout(() => {
      setCurrent(null);
      isShowing.current = false;
      // 间隔后再处理下一个
      window.setTimeout(() => setQueue(q => [...q]), GAP_MS);
    }, DISPLAY_MS);
    return () => clearTimeout(t);
  }, [queue, current]);

  if (!current) return null;
  return (
    <div
      className={cn(
        "fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] w-[340px]",
        "bg-gradient-to-br from-card to-primary-soft border-2 border-primary/40",
        "rounded-3xl px-5 py-4 shadow-cat animate-bubble-in"
      )}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <div className="text-4xl shrink-0 animate-wobble">{current.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-primary font-medium">🎉 解锁新称号</div>
          <div className="text-base font-bold mt-0.5 truncate">{current.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{current.desc}</div>
        </div>
      </div>
    </div>
  );
}