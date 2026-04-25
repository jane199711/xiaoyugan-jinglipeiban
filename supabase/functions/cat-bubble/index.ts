// 小鱼干 — 猫咪智能气泡生成
// 输入:当前精力、近期事件、触发原因
// 输出:一句温暖、不说教的猫咪文案

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  current_energy: number;
  trigger?: "low" | "high" | "drop" | "rise" | "milestone" | "greet";
  recent_events?: { category: string | null; detail: string | null; change: number }[];
  phase?: string;
}

const SYSTEM = `你是「小鱼干」App 里的陪伴小猫咪,说话风格温暖、轻松、不说教,像朋友轻声说话。

【严格约束】
- 只允许基于用户传入的真实数据回应,绝对不可编造未发生的事件、情绪或时间
- 不评判,不打分,不催促,不使用「应该」「必须」「加油」这类施压词
- 允许摆烂、允许休息,鼓励减负而不是产能
- 输出 1-2 句中文,总长度 15-50 个字,不带表情符号(可保留 1 个轻微的颜文字或 ~)
- 不使用编号、列表、markdown,直接说话
- 必须以小猫咪第一人称或对主人的称呼来说`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as ReqBody;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");

    const eventsTxt = (body.recent_events ?? [])
      .slice(0, 5)
      .map(e => `${e.change > 0 ? "+" : ""}${e.change}(${e.category ?? "未分类"}${e.detail ? `:${e.detail}` : ""})`)
      .join("、") || "无";

    const userPrompt = `当前精力:${body.current_energy} 条小鱼干(满10条)
触发场景:${body.trigger ?? "greet"}
近期事件:${eventsTxt}
周期阶段:${body.phase ?? "未追踪"}

请用 1-2 句温暖的话回应主人,不超过 50 字。`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "AI 太忙啦,稍后再试~" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度不够啦,请到 Settings > Workspace > Usage 充值~" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await resp.text();
      console.error("gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI 接口异常" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});