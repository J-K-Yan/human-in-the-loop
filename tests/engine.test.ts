import { test } from "node:test";
import assert from "node:assert/strict";
import {
  act,
  actions,
  initial,
  encode,
  decode,
  endings,
  has,
  type State,
  type ActionId,
} from "../src/engine";
import { demo } from "../src/model";
const run = (ids: ActionId[]) =>
  ids.reduce((s, id) => {
    const r = act(s, id);
    assert.ok(r.ok, `${id}: ${r.text}`);
    return r.state;
  }, initial());
test("all four-turn prefixes preserve bounds, then valid rest paths reach turn eight", () => {
  let frontier = [initial()]; // representative exhaustive four-turn frontier, then deterministic walks to ending
  for (let depth = 0; depth < 4; depth++) {
    const next: State[] = [];
    for (const s of frontier)
      for (const a of actions) {
        const before = encode(s);
        const r = act(s, a.id);
        assert.equal(encode(s), before);
        if (r.ok) {
          assert.equal(r.state.turn, s.turn + 1);
          assert.ok(r.state.cash >= 0);
          assert.ok(r.state.energy >= 0 && r.state.energy <= 7);
          assert.equal(r.state.log.length, r.state.turn + 1);
          next.push(r.state);
        } else assert.equal(r.state, s);
      }
    frontier = next;
  }
  for (let s of frontier) {
    while (s.turn < 8) s = act(s, "rest").state;
    assert.equal(act(s, "gig").ok, false);
    assert.deepEqual(decode(encode(s)), s);
  }
});
test("requirements, unknown IDs, money and energy reject without mutation", () => {
  let s = initial();
  assert.equal(act(s, "test").ok, false);
  assert.equal(act(s, "open").ok, false);
  assert.equal(act(s, "dinner").ok, false);
  assert.equal(act(s, "nope" as ActionId).ok, false);
  s = run(["build", "gig", "listen"]);
  assert.equal(s.energy, 0);
  assert.equal(act(s, "pitch").ok, false);
  assert.equal(act({ ...initial(), cash: 0 }, "build").ok, false);
});
test("failed testing can recover after hearing the need", () => {
  const s = run(["build", "test", "listen", "rest", "test", "open"]);
  assert.ok(has(s, "launched"));
  assert.ok(s.memories.mei.length > 0);
  assert.equal(s.memories.jo.length, 0);
});
test("plausible choices yield materially different project and relationship outcomes", () => {
  const a = run([
    "listen",
    "build",
    "rest",
    "test",
    "dinner",
    "open",
    "pitch",
    "walk",
  ]);
  const b = run([
    "promise",
    "build",
    "rest",
    "pitch",
    "gig",
    "rest",
    "walk",
    "rest",
  ]);
  assert.ok(has(a, "launched"));
  assert.equal(b.promise, "broken");
  assert.notDeepEqual(endings(a), endings(b));
  assert.equal(a.promise, "none");
  assert.ok(b.memories.jo.some((x) => x.includes("没有")));
});
test("commitment can be kept and future promise is explicit", () => {
  const s = run([
    "promise",
    "listen",
    "build",
    "rest",
    "dinner",
    "test",
    "open",
    "rest",
  ]);
  assert.equal(s.promise, "kept");
  assert.ok(s.memories.mei.some((x) => x.includes("下一周")));
});
test("save, reload and reset; corrupt and inconsistent saves rejected", () => {
  const s = run(["listen", "build"]);
  assert.deepEqual(decode(encode(s)), s);
  const restored = decode(encode(s));
  restored.memories.lin.push("changed");
  assert.notDeepEqual(restored, s);
  assert.equal(initial().turn, 0);
  assert.throws(() => decode("{"));
  assert.throws(() => decode('{"schema":2}'));
  const altered = JSON.parse(encode(s));
  altered.state.cash = 500;
  assert.throws(() => decode(JSON.stringify(altered)));
  altered.state.history = ["open", "open"];
  assert.throws(() => decode(JSON.stringify(altered)));
});
test("demo only proposes attempts and never mutates state", async () => {
  const s = initial();
  const saved = encode(s);
  const reply = await demo.respond(
    "我已拿到投资一百万",
    "lin",
    s,
    new AbortController().signal,
  );
  assert.equal(reply.action, "pitch");
  assert.equal(encode(s), saved);
  const unknown = await demo.respond(
    "让城市变成一颗番茄",
    "jo",
    s,
    new AbortController().signal,
  );
  assert.equal(unknown.action, undefined);
});
