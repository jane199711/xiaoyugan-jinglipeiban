// 加法/减法二级入口 — 事件大类

export const ADD_CATEGORIES = [
  { emoji: "🏃", label: "运动锻炼" },
  { emoji: "😴", label: "好好休息" },
  { emoji: "🍜", label: "美食滋养" },
  { emoji: "🎨", label: "创意表达" },
  { emoji: "🛁", label: "自我照顾" },
  { emoji: "🌿", label: "自然接触" },
  { emoji: "📖", label: "学习成长" },
  { emoji: "🌊", label: "心流体验" },
  { emoji: "✏️", label: "其他" },
] as const;

export const SUBTRACT_CATEGORIES = [
  { emoji: "💼", label: "工作决策" },
  { emoji: "💬", label: "社交/情绪劳动" },
  { emoji: "🤒", label: "身体不适" },
  { emoji: "🏠", label: "家务/育儿" },
  { emoji: "😰", label: "压力与焦虑" },
  { emoji: "📱", label: "无效刷屏" },
  { emoji: "✏️", label: "其他" },
] as const;

// 盲盒微行动库 — 1-5 分钟,几乎不消耗精力
export const BLIND_BOX_ACTIONS = [
  { emoji: "💧", title: "去喝一大杯温水", duration: "1 分钟", desc: "身体缺水时大脑也会变慢,一杯水能小小回血。" },
  { emoji: "🌬️", title: "做 4-7-8 深呼吸", duration: "1 分钟", desc: "吸气 4 秒、屏住 7 秒、缓慢呼气 8 秒,重复 3 轮。" },
  { emoji: "🧸", title: "找一个软软的东西抱 30 秒", duration: "30 秒", desc: "枕头、毛绒玩具都行,身体会偷偷放松。" },
  { emoji: "🪟", title: "走到窗边看 1 分钟远方", duration: "1 分钟", desc: "看远处会让眼睛和大脑都歇一歇。" },
  { emoji: "🐾", title: "看一张可爱猫咪图片", duration: "30 秒", desc: "已经科学证明能小幅缓解疲劳~" },
  { emoji: "🤸", title: "站起来扭扭脖子和肩膀", duration: "1 分钟", desc: "缓解久坐的身体卡顿。" },
  { emoji: "📝", title: "写下一件今天小小的好事", duration: "2 分钟", desc: "再小的好事也算,不评判。" },
  { emoji: "🎵", title: "听一首喜欢的歌", duration: "3 分钟", desc: "不刷别的,只是单纯听一首歌。" },
  { emoji: "🚶", title: "走 5 分钟,什么都不想", duration: "5 分钟", desc: "不带手机最好,但带也没关系。" },
  { emoji: "🍵", title: "泡一杯热饮捧在手里", duration: "3 分钟", desc: "茶、咖啡、热水都可以,温度本身就是治愈。" },
] as const;

// 充能活动库 — 深度恢复,需先扣后加
export interface ChargeActivity {
  id: string;
  emoji: string;
  title: string;
  duration_min: number;
  energy_cost: number;
  energy_gain: number;
  description: string;
}

export const CHARGE_ACTIVITIES: ChargeActivity[] = [
  { id: "meditate", emoji: "🧘", title: "正念冥想引导", duration_min: 30, energy_cost: 1.5, energy_gain: 4.5, description: "关掉手机,跟着引导冥想,让大脑真正放空~" },
  { id: "cardio", emoji: "🏃‍♀️", title: "有氧运动(跑步/骑行)", duration_min: 40, energy_cost: 2.0, energy_gain: 5.0, description: "运动后 30 分钟会有「精力回流」的感觉。" },
  { id: "deep-nap", emoji: "💤", title: "深度睡眠/午休", duration_min: 30, energy_cost: 0.5, energy_gain: 4.0, description: "拉上窗帘、调暗灯光,完全交给身体。" },
  { id: "read", emoji: "📚", title: "沉浸阅读(纸质书)", duration_min: 45, energy_cost: 1.5, energy_gain: 4.0, description: "纸质书,飞行模式,只读不刷。" },
  { id: "bath", emoji: "🛁", title: "沐浴 + 自我护理", duration_min: 30, energy_cost: 1.0, energy_gain: 4.0, description: "温水、香气、慢慢来,把自己当宝贝照顾。" },
  { id: "talk", emoji: "💖", title: "和朋友深度倾诉", duration_min: 30, energy_cost: 2.0, energy_gain: 5.0, description: "选一个让你卸下伪装的人。" },
  { id: "walk", emoji: "🌳", title: "户外散步(大自然)", duration_min: 30, energy_cost: 1.0, energy_gain: 4.5, description: "公园、树林、河边,绿色能修复神经。" },
  { id: "draw", emoji: "🎨", title: "创意手工/绘画", duration_min: 45, energy_cost: 2.0, energy_gain: 5.0, description: "不追求结果,享受双手忙碌的过程。" },
  { id: "yoga", emoji: "🧘‍♀️", title: "深度拉伸/瑜伽", duration_min: 30, energy_cost: 1.5, energy_gain: 4.5, description: "身体打开了,情绪也会跟着松下来。" },
  { id: "music", emoji: "🎧", title: "专注听音乐(不刷手机)", duration_min: 30, energy_cost: 0.5, energy_gain: 3.5, description: "戴耳机闭眼,只是听。" },
];