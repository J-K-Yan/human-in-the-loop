import { test, expect } from "@playwright/test";
test("play, proposal, save/reload, corrupt save and reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("确定性演示模式", { exact: true })).toBeVisible();
  await page.locator('[data-action="listen"]').click();
  await expect(page.getByText("1/8 个时段")).toBeVisible();
  await page.reload();
  await expect(page.getByText("1/8 个时段")).toBeVisible();
  await page.locator("#input").fill("做一个原型");
  await page.getByRole("button", { name: "说出来" }).click();
  await expect(page.locator("#confirm")).toBeVisible();
  await expect(page.getByText("1/8 个时段")).toBeVisible();
  await page.locator("#confirm").dblclick({ delay: 50 });
  await expect(page.getByText("2/8 个时段")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("hitl-save-v1", "bad"));
  await page.locator("#load").click();
  await expect(page.getByText("2/8 个时段")).toBeVisible();
  await page.locator("#save").click();
  await page.locator("#reset").click();
  await expect(page.getByText("2/8 个时段")).toBeVisible();
  await page.locator("#reset").click();
  await expect(page.getByText("0/8 个时段")).toBeVisible();
  await page.reload();
  await expect(page.getByText("0/8 个时段")).toBeVisible();
  expect(errors).toEqual([]);
});
test("ending and restart", async ({ page }) => {
  await page.goto("/");
  for (const id of [
    "promise",
    "listen",
    "build",
    "rest",
    "dinner",
    "test",
    "open",
    "rest",
  ])
    await page.locator(`[data-action="${id}"]`).click();
  await expect(page.getByText("你的这一种结局")).toBeVisible();
  await expect(
    page.getByText("一个人真的用上了", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("✓ 你赴了周三的约。乔记得你来了。", { exact: false }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/hitl-ending.png", fullPage: true });
  await page.locator("#reset").click();
  await page.locator("#reset").click();
  await expect(page.getByText("0/8 个时段")).toBeVisible();
});
test("request failure, repeated submit and late response after reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").click();
  await page.route("**/api/respond", (route) =>
    route.fulfill({ status: 503, body: "{}" }),
  );
  await page.locator("#input").fill("你好");
  await page.locator("#chat .primary").click();
  await expect(page.locator("#notice")).toContainText("模型服务暂不可用");
  await expect(page.getByText("0/8 个时段")).toBeVisible();
  await page.unroute("**/api/respond");
  let count = 0;
  await page.route("**/api/respond", async (route) => {
    count++;
    await new Promise((r) => setTimeout(r, 800));
    await route
      .fulfill({ json: { text: "迟到的提案", action: "gig" } })
      .catch(() => {});
  });
  await page.locator("#input").fill("打工");
  await page.locator("#chat").evaluate((form) => {
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await expect(page.locator("#cancel")).toBeVisible();
  await page.locator("#reset").click();
  await page.locator("#reset").click();
  await page.waitForTimeout(1000);
  await expect(page.getByText("0/8 个时段")).toBeVisible();
  await expect(page.getByText("迟到的提案")).toHaveCount(0);
  expect(count).toBeLessThanOrEqual(1);
});
test("mobile viewport fits and cancel keeps state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "/tmp/hitl-mobile.png", fullPage: true });
  await page.locator("#mode").click();
  await page.route("**/api/respond", () => {});
  await page.locator("#input").fill("散步");
  await page.locator("#chat .primary").click();
  await page.locator("#cancel").click();
  await expect(page.locator("#notice")).toContainText("等待已取消");
  await expect(page.getByText("0/8 个时段")).toBeVisible();
});

test("double click on repeatable action spends only one slot", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-action="rest"]').dblclick({ delay: 50 });
  await expect(page.getByText("1/8 个时段")).toBeVisible();
});
