import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
async function start(env: Record<string, string>) {
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await Promise.race([
    once(child.stdout!, "data"),
    once(child, "exit").then(() => {
      throw Error("server exited");
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(Error("server timeout")), 4000);
      timer.unref();
    }),
  ]);
  return child;
}
test("optional adapter: missing setup, limited NPC context, validated output, no state mutation output", async () => {
  const base = "http://127.0.0.1:18787";
  let child = await start({ MODEL_PORT: "18787" });
  try {
    const health = await fetch(base + "/api/health");
    assert.deepEqual(await health.json(), { configured: false });
    assert.equal(
      (await fetch(base + "/api/respond", { method: "POST", body: "{}" }))
        .status,
      503,
    );
  } finally {
    child.kill();
    await once(child, "exit");
  }
  let received: any;
  let result: any = {
    text: "可以去听听梅姨的需求。",
    action: "listen",
    cash: 9999,
  };
  const upstream = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    received = JSON.parse(raw);
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }],
      }),
    );
  });
  await new Promise<void>((r) => upstream.listen(18788, "127.0.0.1", r));
  child = await start({
    MODEL_PORT: "18787",
    MODEL_BASE_URL: "http://127.0.0.1:18788/v1",
    MODEL_API_KEY: "test-fixture-not-a-secret",
    MODEL_NAME: "mock",
  });
  try {
    const send = (body: unknown) =>
      fetch(base + "/api/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const input = {
      input: "想了解需求",
      person: "mei",
      memories: ["你曾来喝过茶。"],
      cash: 9000,
      otherMemories: ["PRIVATE_OTHER_NPC"],
    };
    const response = await send(input);
    assert.deepEqual(await response.json(), {
      text: result.text,
      action: "listen",
    });
    assert.ok(!JSON.stringify(received).includes("PRIVATE_OTHER_NPC"));
    assert.ok(JSON.stringify(received).includes("你曾来喝过茶"));
    result = { text: "成功", action: "grant_money" };
    assert.equal((await send(input)).status, 502);
    assert.equal((await send({ ...input, person: "unknown" })).status, 400);
    assert.equal(
      (await send({ ...input, input: "x".repeat(501) })).status,
      400,
    );
  } finally {
    child.kill();
    await once(child, "exit");
    await new Promise<void>((r) => upstream.close(() => r()));
  }
});
