import "./style.css";
import {
  actions,
  act,
  blocked,
  decode,
  encode,
  endings,
  initial,
  people,
  type ActionId,
  type Person,
  type State,
} from "./engine";
import { demo, live, type Mode, type Reply } from "./model";
let state = initial(),
  mode: Mode = "demo",
  person: Person = "lin",
  reply: Reply | undefined,
  busy = false,
  notice = "",
  controller: AbortController | undefined,
  resetArmed = false;
const liveEnabled = import.meta.env.DEV;
const key = "hitl-save-v1";
const app = document.querySelector<HTMLDivElement>("#app")!;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
function persist() {
  try {
    localStorage.setItem(key, encode(state));
  } catch {
    notice = "浏览器无法保存。当前游戏仍可继续，但关闭页面会丢失进度。";
  }
}
function commit(id: ActionId) {
  if (busy) return;
  const result = act(state, id);
  state = result.state;
  resetArmed = false;
  notice = result.ok ? "已推进一个时段 · 自动保存" : result.text;
  reply = undefined;
  if (result.ok) persist();
  render();
}
function cancel() {
  controller?.abort();
  controller = undefined;
  busy = false;
  reply = undefined;
}
function render() {
  const over = state.turn === 8;
  const days = ["周一", "周二", "周三", "周四"];
  const scene = state.log.at(-1)!;
  app.innerHTML = `<header><a class="brand" href="/">H<span>·</span>L <b>HUMAN IN THE LOOP</b></a><div class="tools"><button id="save">保存</button><button id="load">读取</button><button id="reset">${resetArmed ? "确认重新开始" : "重新开始"}</button></div></header>
<main><section class="intro"><div><p class="eyebrow">一个关于点子、朋友和晚饭的游戏</p><h1>雾湾四日<span> / 工作标题</span></h1><p class="lede">AI 热潮吹过街区。你可以追风，也可以先吃饭。</p></div><div class="edition">PLAYABLE SLICE <span>01 — 四天的可能</span></div></section>
<div class="modebar"><span class="dot"></span><strong>${mode === "demo" ? "确定性演示模式" : "实时模型模式 · 需本地 API 服务"}</strong><span>${mode === "demo" ? "关键词与手写剧情，无模型调用" : "模型只提议行动与生成对话；资源由规则结算"}</span><button id="mode" ${liveEnabled ? "" : "disabled"}>${!liveEnabled ? "公开试玩 · 实时模型未开放" : mode === "demo" ? "切换模型模式" : "返回演示模式"}</button></div>
<div class="layout"><section class="play"><div class="scene"><div class="scene-top"><span>${over ? "周四 · 灯亮起来以后" : `${days[Math.floor(state.turn / 2)]} · ${state.turn % 2 ? "傍晚" : "午后"}`}</span><span>${state.turn}/8 个时段</span></div><div class="town" aria-hidden="true"><div class="sun"></div><div class="hill"></div><div class="house h1"><i></i><i></i><b>修理铺</b></div><div class="house h2"><i></i><i></i><b>COFFEE / IDEAS</b></div><div class="house h3"><i></i><i></i><b>乔的屋顶 ↑</b></div><div class="road"></div><div class="tree">✳</div></div><div class="story"><p class="eyebrow">${over ? "尾声" : "街区正在发生"}</p><h2>${over ? "没有标准答案的四天" : state.turn === 0 ? "不如，从一个小点子开始。" : actions.find((a) => state.flags.at(-1) === "done:" + a.id)?.place || "生活继续往前"}</h2><p>${esc(scene.text).replace(/\n/g, "<br>")}</p></div></div>
${
  over
    ? `<section class="endings"><p class="eyebrow">你的这一种结局</p>${endings(
        state,
      )
        .map((e) => `<article><h3>${e.title}</h3><p>${e.text}</p></article>`)
        .join(
          "",
        )}<p>换一种选择，还会有别的四天。用右上角「重新开始」再走一次。</p></section>`
    : `<section class="choices"><div class="section-head"><h2>接下来，你想做什么？</h2><span>每个行动占 1 时段</span></div><div class="cards">${actions
        .map((a) => {
          const reason = blocked(state, a.id);
          return `<button class="action" data-action="${a.id}" ${reason || busy ? "disabled" : ""}><span class="action-icon">${a.icon}</span><span><strong>${a.title}</strong><small>${a.desc}</small><em>${a.cost > 0 ? `−$${a.cost}` : a.cost < 0 ? `+$${-a.cost}` : "免费"} · 精力 ${a.energy > 0 ? "+" : ""}${a.energy}${reason ? ` · ${reason}` : ""}</em></span></button>`;
        })
        .join("")}</div></section>`
}
<details class="journal"><summary>翻开这四天的记事本 <span>${state.log.length} 则</span></summary>${state.log.map((l) => `<p><b>${l.turn === 0 ? "开始" : `第 ${l.turn} 时段`}</b>${esc(l.text)}</p>`).join("")}</details></section>
<aside><section class="pocket"><p class="eyebrow">口袋与余力</p><div class="resources"><div><strong>$${state.cash}</strong><span>可支配零钱</span></div><div><strong>${state.energy}<small>/7</small></strong><span>精力</span></div></div><p>不用付房租倒计时。这是你为四天留出的零钱；累了可以休息。</p></section><section class="promise"><h3>写下来的约定</h3><p>${state.promise === "none" ? "还没有晚餐承诺。乔周三会在屋顶做饭。" : state.promise === "pending" ? "待赴约 · 周三结束前，去屋顶帮乔做晚餐。" : state.promise === "kept" ? "✓ 你赴了周三的约。乔记得你来了。" : "你错过了周三晚餐。乔记得这个承诺。"}${state.flags.includes("launched") ? "<br>待履行 · 下周回修理铺听使用反馈（本切片之外）。" : ""}</p></section>
<section class="conversation"><p class="eyebrow">人，不只是任务入口</p><h2>聊聊，或者试点别的</h2><label for="person">找谁说话</label><select id="person" ${busy ? "disabled" : ""}>${Object.entries(
    people,
  )
    .map(
      ([id, p]) =>
        `<option value="${id}" ${id === person ? "selected" : ""}>${p.name} · ${p.role}</option>`,
    )
    .join(
      "",
    )}</select><p class="goal">${people[person].goal}</p><details><summary>对方记得什么</summary><p>${state.memories[person].map(esc).join("<br>") || "还没有共同经历。对方不会自动知道你在其他地方做过的事。"}</p></details><form id="chat"><label for="input">你的话 / 想尝试的行动</label><textarea id="input" maxlength="500" ${busy || over ? "disabled" : ""} placeholder="比如：我想先问问梅姨需要什么，再决定要不要做。"></textarea><button class="primary" ${busy || over ? "disabled" : ""}>${busy ? "正在等回复…" : "说出来 ↗"}</button>${busy ? '<button type="button" id="cancel">取消等待</button>' : ""}</form><p class="hint">聊天不消耗时段。行动提案需要你确认；说“我拿到了投资”不会凭空增加钱。</p><div role="status" class="reply">${reply ? `<p>${esc(reply.text).replace(/\n/g, "<br>")}</p>${reply.action ? `<div class="proposal"><strong>行动提案：${actions.find((a) => a.id === reply!.action)!.title}</strong><p>${blocked(state, reply.action) || "将按场景卡列出的费用与精力，结算 1 时段。"}</p><button id="confirm" class="primary" ${blocked(state, reply.action) ? "disabled" : ""}>确认尝试</button></div>` : ""}` : ""}</div></section></aside></div><p id="notice" class="notice" role="status">${esc(notice)}</p><footer>HUMAN IN THE LOOP · 一个尚在生长的原型 <span>虚构人物与街区 / 约 10–15 分钟 / 本机浏览器存档</span></footer></main>`;
  app.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(
    (el) =>
      (el.onclick = (e) => {
        if (e.detail < 2) commit(el.dataset.action as ActionId);
      }),
  );
  app.querySelector<HTMLButtonElement>("#save")!.onclick = () => {
    notice = "已保存到此浏览器。";
    persist();
    render();
  };
  app.querySelector<HTMLButtonElement>("#load")!.onclick = () => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) throw Error("没有找到存档。先走一步或点击保存。");
      const loaded = decode(raw);
      cancel();
      state = loaded;
      notice = "已读取存档。";
    } catch (e) {
      notice = "存档不存在、已损坏或与此版本不兼容，当前进度未改变。";
    }
    render();
  };
  app.querySelector<HTMLButtonElement>("#reset")!.onclick = () => {
    if (!resetArmed) {
      resetArmed = true;
      notice = "再次点击确认重新开始，将覆盖此浏览器存档。";
      render();
      return;
    }
    cancel();
    state = initial();
    resetArmed = false;
    notice = "新的一周，从头开始。";
    persist();
    render();
  };
  app.querySelector<HTMLButtonElement>("#mode")!.onclick = () => {
    if (!liveEnabled) return;
    cancel();
    mode = mode === "demo" ? "live" : "demo";
    notice = "模式已切换，进度保留。";
    render();
  };
  app.querySelector<HTMLSelectElement>("#person")!.onchange = (e) => {
    person = (e.target as HTMLSelectElement).value as Person;
    reply = undefined;
    render();
  };
  app
    .querySelector<HTMLButtonElement>("#confirm")
    ?.addEventListener("click", () => reply?.action && commit(reply.action));
  app
    .querySelector<HTMLButtonElement>("#cancel")
    ?.addEventListener("click", () => {
      cancel();
      notice = "等待已取消，进度未改变。";
      render();
    });
  app.querySelector<HTMLFormElement>("#chat")!.onsubmit = async (e) => {
    e.preventDefault();
    if (busy || over) return;
    const input = app
      .querySelector<HTMLTextAreaElement>("#input")!
      .value.trim();
    if (!input) {
      notice = "先写一句话。";
      render();
      return;
    }
    busy = true;
    const request = new AbortController();
    controller = request;
    const timer = setTimeout(() => request.abort(), 20000);
    render();
    try {
      const result = await (
        import.meta.env.DEV && mode === "live" ? live : demo
      ).respond(input, person, state, request.signal);
      if (controller === request) reply = result;
    } catch (e) {
      if (controller === request)
        notice = request.signal.aborted
          ? "等待超时，进度未改变。请重试。"
          : (e as Error).message;
    } finally {
      clearTimeout(timer);
      if (controller === request) {
        busy = false;
        controller = undefined;
        render();
      }
    }
  };
}
try {
  const saved = localStorage.getItem(key);
  if (saved) {
    state = decode(saved);
    notice = "已自动恢复此浏览器存档。";
  }
} catch (e) {
  notice = (e as Error).message;
}
render();
