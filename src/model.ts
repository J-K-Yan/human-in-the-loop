import {
  actions,
  people,
  type ActionId,
  type Person,
  type State,
} from "./engine";
export type Mode = "demo" | "live";
export interface Reply {
  text: string;
  action?: ActionId;
}
export interface ModelAdapter {
  respond(
    input: string,
    person: Person,
    state: State,
    signal: AbortSignal,
  ): Promise<Reply>;
}
export const demo: ModelAdapter = {
  async respond(input, p, s) {
    const rules: [RegExp, ActionId][] = [
      [/打印|制作|开发|原型|编程/, "build"],
      [/隐私|需求|采访|听听|维修铺/, "listen"],
      [/试用|测试|水壶/, "test"],
      [/路演|融资|投资|开放麦/, "pitch"],
      [/打工|零工|赚钱|苗圃/, "gig"],
      [/海边|散步|录音/, "walk"],
      [/答应|承诺/, "promise"],
      [/晚饭|晚餐|做饭|赴约/, "dinner"],
      [/开放|发布|交付/, "open"],
      [/休息|睡觉/, "rest"],
    ];
    const match = rules.find(([r]) => r.test(input));
    if (match)
      return {
        action: match[1],
        text: "演示模式按关键词把这句话理解为一次行动尝试。请检查下面的提案；确认之前不会推进时间或改变资源。",
      };
    const memory = s.memories[p].at(-1);
    return {
      text: `${people[p].name}：${memory ? `“我记得：${memory}”` : "“我们还没有一起经历过什么，先聊眼前的事吧。”"} ${people[p].goal}\n演示模式只支持有限关键词。你可以试试“请邻居试用”“去海边”，或直接选择场景卡。你说已经成功，并不会让它发生。`,
    };
  },
};
export const live: ModelAdapter = {
  async respond(input, p, s, signal) {
    const res = await fetch("/api/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input, person: p, memories: s.memories[p] }),
      signal,
    });
    if (!res.ok)
      throw Error("模型服务暂不可用。进度未改变；可重试或切回演示模式。");
    const data = await res.json();
    if (
      typeof data.text !== "string" ||
      data.text.length > 3000 ||
      (data.action && !actions.some((a) => a.id === data.action))
    )
      throw Error("模型返回格式无效，进度未改变。");
    return { text: data.text, action: data.action };
  },
};
