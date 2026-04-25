import fishFilled from "@/assets/fish-filled.png";
import fishOutline from "@/assets/fish-outline.png";
import catHero from "@/assets/cat-hero.png";
import { useMemo } from "react";

interface Props {
  energy: number; // 0-10, 0.5 step
  size?: number; // px
  onCatClick?: () => void;
}

/** 圆形小鱼干分布 + 中心猫咪 */
export function FishCircle({ energy, size = 280, onCatClick }: Props) {
  // 全部 10 个槽位 — 在最高 10 时占满圆周;低精力时只用上半弧
  const slots = useMemo(() => {
    const filledCount = Math.floor(energy);
    const halfNext = energy - filledCount >= 0.5;
    const total = 10;
    const radius = size * 0.42;

    return Array.from({ length: total }, (_, i) => {
      // 当 energy<=5 时,显示在上半弧 (180° → 360°);否则均布全圆周(从顶部起)
      const useHalf = energy <= 5 && energy > 0;
      let angle: number;
      if (useHalf) {
        // i in 0..4 → 180°..360° (上半弧)
        angle = Math.PI + (i / Math.max(1, 4)) * Math.PI;
      } else {
        // 顶部开始,顺时针均布
        angle = -Math.PI / 2 + (i / total) * Math.PI * 2;
      }
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;

      let state: "filled" | "half" | "empty" = "empty";
      if (i < filledCount) state = "filled";
      else if (i === filledCount && halfNext) state = "half";
      return { x, y, state, angle, key: i };
    });
  }, [energy, size]);

  const fishSize = size * 0.18;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {slots.map(s => (
        <img
          key={s.key}
          src={s.state === "empty" ? fishOutline : fishFilled}
          alt=""
          aria-hidden
          loading="lazy"
          width={fishSize}
          height={fishSize}
          style={{
            position: "absolute",
            left: `calc(50% + ${s.x}px - ${fishSize / 2}px)`,
            top: `calc(50% + ${s.y}px - ${fishSize / 2}px)`,
            width: fishSize,
            height: fishSize,
            opacity: s.state === "empty" ? 0.45 : s.state === "half" ? 0.4 : 1,
            transform: `rotate(${(s.angle * 180) / Math.PI + 90}deg)`,
            transition: "opacity 220ms, transform 320ms",
          }}
          className={s.state !== "empty" ? "drop-shadow-sm" : ""}
        />
      ))}
      <button
        type="button"
        onClick={onCatClick}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        style={{ width: size * 0.46, height: size * 0.46 }}
        aria-label="召唤陪伴小猫"
      >
        <img
          src={catHero}
          alt="陪伴小猫"
          width={size * 0.46}
          height={size * 0.46}
          className="w-full h-full object-contain animate-float drop-shadow-[0_12px_20px_hsl(18_60%_50%/0.25)]"
        />
      </button>
    </div>
  );
}