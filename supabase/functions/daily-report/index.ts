// 小鱼干 — AI 日报生成
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ReqBody {
  date: string;
  records: { timestamp: string; energy_score: number; score_change: number; event_category: string | null; event_detail: string | null }[];
  blind_box_count?: number;
  charge_sessions?: { activity: string; cost: number; gain: number; status: "completed" | "abandoned" }[];
  phase?: string;
}

const SYSTEM = `你是「小鱼干」App 里的陪伴小猫咪,正在为主人写今日精力日报。

【严格约束】
- 只描述传入的真实数据,绝对不可编造任何未发生的事件、数字或情绪
- 不评判、不打分、不说教,语气温暖像朋友写给朋友的观察
- 若有充能行为,必须提及并给予鼓励
- 第二段是基于今日真实规律的轻建议(无规律就不写)
- 第三段仅在「周期阶段」非「未追踪」时出现,简短的周期视角观察
- 总字数 120-180,可使用少量表情符号和换行,不要使用列表/标题/markdown 标头
- 第一人称(小猫咪)称呼对方为「主人」或「你」`;

function fmtHour(ts: string) {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as ReqBody;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY 未配置");
    if (!body.records?.length) {
      return new Response(JSON.stringify({ content: null, reason: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const avg = body.records.reduce((s, r) => s + r.energy_score, 0) / body.records.length;
    const minR = body.records.reduce((m, r) => (r.energy_score < m.energy_score ? r : m));
    const maxR = body.records.reduce((m, r) => (r.energy_score > m.energy_score ? r : m));
    const events = body.records
      .filter(r => r.event_category)
      .map(r => `${r.event_category}${r.event_detail ? `(${r.event_detail})` : ""}`);
    const completedCharges = (body.charge_sessions ?? []).filter(c => c.status === "completed");

    const userPrompt = `今天数据(${body.date}):
- 平均精力:${avg.toFixed(1)} 条
- 最低:${minR.energy_score} 条 (${fmtHour(minR.timestamp)})
- 最高:${maxR.energy_score} 条
- 消耗/补充事件:${events.length ? events.join("、") : "无详细记录"}
- 盲盒使用:${body.blind_box_count ?? 0} 次
- 充能活动:${completedCharges.length ? completedCharges.map(c => `${c.activity}(净增${(c.gain - c.cost).toFixed(1)}条)`).join("、") : "今日无充能"}
- 周期阶段:${body.phase ?? "未追踪"}

请按要求生成日报。`;

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
      if (resp.status === 429) return new Response(JSON.stringify({ error: "AI 太忙,稍后再试~" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI 额度不够,请到 Settings → Workspace → Usage 充值" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI 接口异常" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    return new Response(JSON.stringify({ content }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});