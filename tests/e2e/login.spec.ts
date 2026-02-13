import { test, expect } from "@playwright/test";

test("login page renders auth controls", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: /paper feed for real life relevance/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign up" }).first()).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.locator("form").getByRole("button", { name: "Sign in" })).toBeVisible();
});
