import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
test("public build is demo-only, offline from model APIs, and playable through ending", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/")) apiRequests.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByText("确定性演示模式", { exact: true })).toBeVisible();
  await expect(page.locator("#mode")).toBeDisabled();
  await expect(page.locator("#mode")).toHaveText("公开试玩 · 实时模型未开放");
  await page.locator("#input").fill("先听听需求");
  await page.locator("#chat .primary").click();
  await page.locator("#confirm").click();
  await page.reload();
  await expect(page.getByText("1/8 个时段")).toBeVisible();
  for (const id of ["build", "rest", "test", "dinner", "open", "pitch", "walk"])
    await page.locator(`[data-action="${id}"]`).click();
  await expect(
    page.getByText("一个人真的用上了", { exact: true }),
  ).toBeVisible();
  expect(apiRequests).toEqual([]);
  for (const file of readdirSync("dist/assets").filter((x) =>
    x.endsWith(".js"),
  )) {
    expect(readFileSync("dist/assets/" + file, "utf8")).not.toContain(
      "/api/respond",
    );
  }
  await page.locator("#reset").click();
  await page.locator("#reset").click();
  await expect(page.getByText("0/8 个时段")).toBeVisible();
});
