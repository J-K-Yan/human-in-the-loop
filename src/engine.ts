export type Person = "lin" | "jo" | "mei";
export type ActionId =
  | "listen"
  | "build"
  | "test"
  | "pitch"
  | "gig"
  | "walk"
  | "dinner"
  | "promise"
  | "open"
  | "rest";
export interface State {
  version: 1;
  history: ActionId[];
  turn: number;
  cash: number;
  energy: number;
  flags: string[];
  memories: Record<Person, string[]>;
  log: { turn: number; text: string }[];
  promise: "none" | "pending" | "kept" | "broken";
}
export interface Action {
  id: ActionId;
  title: string;
  place: string;
  icon: string;
  cost: number;
  energy: number;
  desc: string;
}
export const people: Record<
  Person,
  { name: string; role: string; goal: string }
> = {
  lin: {
    name: "林小满",
    role: "朋友 · 独立开发者",
    goal: "想做有人用的东西，也想按时吃晚饭。",
  },
  jo: {
    name: "乔",
    role: "室友 · 声音采集爱好者",
    goal: "周三办一场没有路演的屋顶晚餐。",
  },
  mei: {
    name: "梅姨",
    role: "街角修理铺店主",
    goal: "让老邻居找到维修服务，不想再学一个后台。",
  },
};
export const actions: Action[] = [
  {
    id: "listen",
    title: "去修理铺听听",
    place: "街角修理铺",
    icon: "↗",
    cost: 0,
    energy: -1,
    desc: "听真实麻烦。梅姨有茶，也有对“颠覆”的意见。",
  },
  {
    id: "build",
    title: "和小满做一个原型",
    place: "车库工作台",
    icon: "⌘",
    cost: 30,
    energy: -2,
    desc: "买材料和托管额度。先做小，再做完。",
  },
  {
    id: "test",
    title: "请邻居试用",
    place: "社区洗衣房",
    icon: "◎",
    cost: 0,
    energy: -1,
    desc: "原型要经过真人这一关。需要先有原型。",
  },
  {
    id: "pitch",
    title: "去开放麦讲点子",
    place: "咖啡馆",
    icon: "↗",
    cost: 20,
    energy: -1,
    desc: "这里连拿铁都有路线图。可能认识愿意帮忙的人。",
  },
  {
    id: "gig",
    title: "接一单普通零工",
    place: "街区花园",
    icon: "✳",
    cost: -70,
    energy: -2,
    desc: "帮社区整理苗圃。报酬明确，没有股权。",
  },
  {
    id: "walk",
    title: "和乔去海边录声音",
    place: "海边步道",
    icon: "≈",
    cost: 0,
    energy: 2,
    desc: "发现一段不需要转化率的下午。",
  },
  {
    id: "promise",
    title: "答应帮乔准备晚餐",
    place: "公寓厨房",
    icon: "♡",
    cost: 0,
    energy: 1,
    desc: "先聊聊、歇口气。承诺在周三结束前赴约。",
  },
  {
    id: "dinner",
    title: "去屋顶做晚饭",
    place: "公寓屋顶",
    icon: "☼",
    cost: 25,
    energy: 2,
    desc: "周三开放。带点菜，和朋友坐下来。",
  },
  {
    id: "open",
    title: "把工具开放给街坊",
    place: "街角修理铺",
    icon: "◇",
    cost: 10,
    energy: -1,
    desc: "需要试用通过。放弃今天讲大故事，先让一个人用上。",
  },
  {
    id: "rest",
    title: "回家休息",
    place: "自己的房间",
    icon: "☾",
    cost: 0,
    energy: 3,
    desc: "烧水、关通知。明天还在。",
  },
];
export function initial(): State {
  return {
    version: 1,
    history: [],
    turn: 0,
    cash: 120,
    energy: 5,
    flags: [],
    memories: { lin: [], jo: [], mei: [] },
    promise: "none",
    log: [
      {
        turn: 0,
        text: "周一，小满发来消息：“要不要一起做点什么？不用改变世界，先改变梅姨找不到维修单这件事。”你还有四天时间，周四傍晚街区有一场小聚。",
      },
    ],
  };
}
export const has = (s: State, f: string) => s.flags.includes(f);
export function blocked(s: State, id: ActionId): string | undefined {
  const a = actions.find((x) => x.id === id);
  if (!a) return "没有这个行动。";
  if (s.turn >= 8) return "这段故事已经结束，可以重新开始。";
  if (s.cash < a.cost) return "零钱不够，先接零工或选个免费的行动。";
  if (s.energy + a.energy < 0) return "现在太累了，先休息或去散步。";
  if (id === "test" && !has(s, "prototype")) return "先和小满做出原型。";
  if (id === "open" && !has(s, "tested")) return "先请邻居试用通过。";
  if (id === "dinner" && (s.turn < 4 || s.turn > 5))
    return "屋顶晚餐只在周三（第 5–6 时段）开放。";
  if (id === "promise" && (s.turn > 4 || s.promise !== "none"))
    return "这次晚餐的承诺已经确定，或者时间已过。";
  if (
    ["listen", "build", "test", "pitch", "walk", "dinner", "open"].includes(
      id,
    ) &&
    has(s, "done:" + id)
  )
    return "这一幕已经发生了，试试别的选择。";
}
export function act(
  s: State,
  id: ActionId,
): { state: State; text: string; ok: boolean } {
  const reason = blocked(s, id);
  if (reason) return { state: s, text: reason, ok: false };
  const a = actions.find((x) => x.id === id)!;
  const n = structuredClone(s);
  n.cash -= a.cost;
  n.energy = Math.min(7, n.energy + a.energy);
  n.flags.push("done:" + id);
  const flag = (f: string) => {
    if (!has(n, f)) n.flags.push(f);
  };
  const remember = (p: Person, t: string) => n.memories[p].push(t);
  let text = "";
  switch (id) {
    case "listen":
      flag("need");
      remember("mei", "你听她讲了纸质维修单的麻烦，也答应不收集顾客隐私。");
      text =
        "梅姨翻出一个饼干盒：“我的数据库。断网也能用。”她需要能打印的大字维修单，不是会聊天的冰箱。你们约定：不收集顾客隐私。";
      break;
    case "build":
      flag("prototype");
      remember(
        "lin",
        has(s, "need")
          ? "你们一起做了大字维修单。"
          : "你们一起做了一个会写维修诗的原型。",
      );
      text = has(s, "need")
        ? "小满把所有“智能”按钮删到只剩一个：“打印”。第一张大字维修单出来了。你们郑重击掌，打印机卡纸作为返礼。"
        : "你们做出一个会给坏烤面包机写诗的助手。小满笑到趴下：“艺术完成了，需求还没有。”";
      break;
    case "test":
      if (has(s, "need")) {
        flag("tested");
        remember("mei", "邻居试用了你们的大字维修单，觉得实用。");
        text =
          "邻居戴着老花镜完成了第一张维修单：“这次我看得见。”梅姨点头：可以试着用了。";
      } else {
        flag("feedback");
        text =
          "邻居看完维修诗，问：“所以我的水壶在哪里？”试用没通过。去听梅姨讲需求后，可以再试一次。";
      }
      break;
    case "pitch":
      flag("contact");
      if (has(s, "tested")) flag("pilot");
      remember("lin", "你去了开放麦，带回一个可能合作的联系人。");
      text = has(s, "tested")
        ? "你讲了维修单和邻居的反应。一位社区组织者愿意下周试点——只是约见，还不是投资到账。"
        : "你把点子讲给一屋子人听。有人递来名片：“等有人真用，再来聊。”咖啡师把你的名字写成了“种子轮”。";
      break;
    case "gig":
      text = "你整理了苗圃，赚到 $70。管理员送你一盆葱：“这才是可持续增长。”";
      flag("onion");
      break;
    case "walk":
      flag("sea");
      remember("jo", "你和乔录下海浪与一只抢薯条的海鸥。");
      text =
        "乔把海浪录了三分钟。一只海鸥抢走路人的薯条。“它找到产品市场契合了。”你笑了很久。";
      break;
    case "promise":
      n.promise = "pending";
      remember("jo", "你答应周三结束前来屋顶帮忙做晚餐。");
      text =
        "乔递给你一杯水：“周三来帮忙吧。你本人来就行，不用带演示文稿。”你答应了。";
      break;
    case "dinner":
      flag("dinner");
      if (n.promise === "pending") n.promise = "kept";
      remember("jo", "你周三来了屋顶，一起做饭，听完了乔的海浪录音。");
      text =
        "锅盖被风吹得像飞碟。大家吃稍微糊了的炒饭，听乔的海浪。小满说这比任何发布会都像发布会。";
      break;
    case "open":
      flag("launched");
      remember("mei", "你把工具交给街坊，承诺下一周来听使用反馈。");
      text =
        "梅姨贴出第一张维修单。你约定下周回来听反馈。没有庆功香槟，她给了你一瓶冰豆奶：“续费。”";
      break;
    case "rest":
      text =
        "你把手机扣在桌上，泡了一杯茶。窗外有只猫在审查自动驾驶汽车。睡一觉后，脑子终于不再开十二个标签页。";
      break;
  }
  if (id === "test" && !has(n, "tested"))
    n.flags = n.flags.filter((f) => f !== "done:test");
  n.history.push(id);
  n.turn++;
  if (n.turn === 6 && n.promise === "pending") {
    n.promise = "broken";
    remember("jo", "你没有在周三赴约。乔自己准备了晚餐。");
    text += "\n周三过去了。乔发来消息：“饭给你留了。下次来不了，提前说。”";
  }
  n.log.push({ turn: n.turn, text });
  return { state: n, text, ok: true };
}
export function endings(s: State): { title: string; text: string }[] {
  return [
    {
      title: has(s, "launched")
        ? "一个人真的用上了"
        : has(s, "pilot")
          ? "下周，有个约见"
          : has(s, "prototype")
            ? "桌上留下一个原型"
            : "这四天，不必成为创业故事",
      text: has(s, "launched")
        ? "街坊开始打印维修单。项目很小，下一步也具体：回来听反馈。"
        : has(s, "pilot")
          ? "社区组织者愿意谈试点，能否持续还要靠后续工作。"
          : has(s, "prototype")
            ? "你知道了一个点子与生活之间还有多远，原型随时可以重做。"
            : "你仍然可以探索新点子，也可以把自己的生活当作值得投入的事。",
    },
    {
      title:
        s.promise === "broken"
          ? "一顿错过的晚饭"
          : has(s, "dinner")
            ? "屋顶有你的位置"
            : has(s, "sea")
              ? "你们记得那只海鸥"
              : "朋友各自忙着",
      text:
        s.promise === "broken"
          ? "乔记得你失约了。关系没有归零，但修复需要一次具体的道歉和行动。"
          : has(s, "dinner")
            ? "你们有了一顿共同记得的饭。乔还在为下一次声音小展做准备。"
            : has(s, "sea")
              ? "乔保留了你笑出声的录音，准备放进声音小展。"
              : "小满继续写程序，乔继续录声音。下一次相遇仍有新的话题。",
    },
    {
      title: "留给明天的自己",
      text: `你还有 $${s.cash}，${s.energy <= 1 ? "身体提醒你该休息了" : s.energy >= 5 ? "也留出了一些精神空间" : "精力还够过一个普通晚上"}。${has(s, "onion") ? "窗台上的葱已经冒出新芽。" : "街区的灯慢慢亮起来。"}`,
    },
  ];
}
export function encode(s: State) {
  return JSON.stringify({ schema: 1, state: s });
}
export function decode(raw: string): State {
  const value = JSON.parse(raw);
  const s = value?.state;
  if (
    value?.schema !== 1 ||
    !s ||
    s.version !== 1 ||
    !Number.isInteger(s.turn) ||
    s.turn < 0 ||
    s.turn > 8 ||
    !Number.isInteger(s.cash) ||
    s.cash < 0 ||
    s.cash > 680 ||
    !Number.isInteger(s.energy) ||
    s.energy < 0 ||
    s.energy > 7 ||
    !Array.isArray(s.flags) ||
    s.flags.length > 30 ||
    !s.flags.every((x: unknown) => typeof x === "string" && x.length < 80) ||
    !["none", "pending", "kept", "broken"].includes(s.promise) ||
    !Array.isArray(s.log) ||
    s.log.length !== s.turn + 1 ||
    !s.log.every(
      (x: any, i: number) =>
        x?.turn === i && typeof x.text === "string" && x.text.length < 3000,
    ) ||
    !s.memories ||
    !(["lin", "jo", "mei"] as Person[]).every(
      (p) =>
        Array.isArray(s.memories[p]) &&
        s.memories[p].length <= 16 &&
        s.memories[p].every(
          (x: unknown) => typeof x === "string" && x.length < 1000,
        ),
    )
  )
    throw Error("存档格式不兼容或已损坏，当前进度没有改变。");
  if (!Array.isArray(s.history) || s.history.length !== s.turn)
    throw Error("存档行动记录无效，当前进度没有改变。");
  let replay = initial();
  for (const id of s.history) {
    if (!actions.some((a) => a.id === id)) throw Error("存档行动记录无效。");
    const result = act(replay, id);
    if (!result.ok) throw Error("存档包含无法执行的行动。");
    replay = result.state;
  }
  if (JSON.stringify(replay) !== JSON.stringify(s))
    throw Error("存档状态与行动记录不一致，当前进度没有改变。");
  return replay;
}
