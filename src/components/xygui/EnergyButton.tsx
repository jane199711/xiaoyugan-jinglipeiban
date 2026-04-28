import { useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Type = "add" | "subtract";

interface Props {
  type: Type;
  disabled?: boolean;
  /** 单击触发 ±0.5 */
  onSingle: () => void;
  /** 长按触发(进入事件记录页) */
  onLongPress: () => void;
}

const LONGPRESS_DELAY = 600;
const MOVE_TOLERANCE = 10; // px

/**
 * 两级交互按钮:
 *  - 单击 / 单触:±0.5
 *  - 长按 ≥600ms:进入事件记录页
 * 用 pointerdown 计时,pointerup 之前若已超时则视为长按、不再触发单击。
 * 移除了双击逻辑(原先 300ms 等待会让移动端感觉"没反应")。
 */
export function EnergyButton({ type, disabled, onSingle, onLongPress }: Props) {
  const timerRef = useRef<number | null>(null);
  const longFiredRef = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const activeRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const handleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    // 只接收主键 / 触摸 / 笔
    if (e.pointerType === "mouse" && e.button !== 0) return;
    activeRef.current = true;
    longFiredRef.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
    } catch {
      /* noop */
    }
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      longFiredRef.current = true;
      timerRef.current = null;
      // 触觉反馈(手机)
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate?.(20); } catch { /* ignore */ }
      }
      onLongPress();
    }, LONGPRESS_DELAY);
  };

  const handleUp = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    const wasLong = longFiredRef.current;
    clearTimer();
    if (!wasLong && !disabled) {
      onSingle();
    }
  };

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!activeRef.current || !startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (Math.hypot(dx, dy) > MOVE_TOLERANCE) {
      // 滑出按钮范围,取消本次操作
      activeRef.current = false;
      clearTimer();
    }
  };

  const handleCancel = () => {
    activeRef.current = false;
    clearTimer();
  };

  const isAdd = type === "add";

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handleDown}
      onPointerUp={handleUp}
      onPointerMove={handleMove}
      onPointerCancel={handleCancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={isAdd ? "增加 0.5 条小鱼干,长按记录事件" : "减少 0.5 条小鱼干,长按记录事件"}
      className={cn(
        "select-none touch-none w-16 h-16 rounded-full grid place-items-center transition-all active:scale-95",
        "bg-gradient-to-br shadow-pillow border-2 border-white/70",
        isAdd
          ? "from-primary to-fish text-primary-foreground"
          : "from-secondary to-accent text-secondary-foreground",
        disabled && "opacity-40 grayscale cursor-not-allowed active:scale-100"
      )}
    >
      {isAdd ? <Plus className="w-7 h-7" strokeWidth={3} /> : <Minus className="w-7 h-7" strokeWidth={3} />}
    </button>
  );
}