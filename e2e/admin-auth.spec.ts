import { test, expect } from "@playwright/test";

test.describe("Admin Authentication", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/admin/login");

    // Brand elements
    await expect(page.locator("text=Kivara")).toBeVisible();
    await expect(page.locator("text=Admin Panel")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();

    // Form fields
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("login page shows validation for empty fields", async ({ page }) => {
    await page.goto("/admin/login");

    // Native validation: try submitting empty form
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");

    // HTML5 validation fires for required fields
    await emailInput.focus();
    await emailInput.blur();
    await passwordInput.focus();
    await passwordInput.blur();

    // Submit with empty fields
    await page.getByRole("button", { name: "Sign In" }).click();

    // The browser's native validation should prevent submission
    // We should still be on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("login page shows toggle password visibility", async ({ page }) => {
    await page.goto("/admin/login");

    const passwordInput = page.locator("#password");
    const toggleButton = page.locator('button[tabIndex="-1"]');

    // Initially password is hidden
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click eye icon to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again to hide
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");

    await page.locator("#email").fill("invalid@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show error message
    await expect(page.locator("text=Invalid email or password").or(page.locator("text=Email not confirmed"))).toBeVisible({ timeout: 15000 });
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    // Try to access admin dashboard directly
    await page.goto("/admin");

    // Should redirect to login with redirect param
    await expect(page).toHaveURL(/\/admin\/login\?redirect=/, { timeout: 15000 });
  });

  test("unauthenticated access to sub-page redirects to login", async ({ page }) => {
    await page.goto("/admin/properties");
    await expect(page).toHaveURL(/\/admin\/login\?redirect=/, { timeout: 15000 });
  });

  test("unauthenticated access to journeys page redirects to login", async ({ page }) => {
    await page.goto("/admin/journeys");
    await expect(page).toHaveURL(/\/admin\/login\?redirect=/, { timeout: 15000 });
  });
});
