import { test, expect } from "@playwright/test";

test.describe("Admin API Authentication", () => {
  const API_BASE = "/api/admin";

  // All admin API endpoints should return 401 when accessed without auth
  const UNPROTECTED_ENDPOINTS = [
    { method: "GET", path: `${API_BASE}/properties` },
    { method: "GET", path: `${API_BASE}/bookings` },
    { method: "GET", path: `${API_BASE}/journeys` },
    { method: "GET", path: `${API_BASE}/guest-profiles` },
    { method: "GET", path: `${API_BASE}/tours` },
    { method: "GET", path: `${API_BASE}/packages` },
    { method: "GET", path: `${API_BASE}/blog` },
    { method: "GET", path: `${API_BASE}/media` },
    { method: "GET", path: `${API_BASE}/users` },
    { method: "GET", path: `${API_BASE}/inquiries` },
    { method: "GET", path: `${API_BASE}/suppliers` },
    { method: "GET", path: `${API_BASE}/finance/transactions` },
    { method: "GET", path: `${API_BASE}/finance/invoices` },
    { method: "GET", path: `${API_BASE}/finance/expenses` },
    { method: "GET", path: `${API_BASE}/destinations` },
    { method: "GET", path: `${API_BASE}/experiences` },
    { method: "GET", path: `${API_BASE}/tour-availability` },
    { method: "GET", path: `${API_BASE}/settings` },
    { method: "GET", path: `${API_BASE}/audit-log` },
    { method: "GET", path: `${API_BASE}/analytics` },
  ];

  for (const ep of UNPROTECTED_ENDPOINTS) {
    test(`${ep.method} ${ep.path} returns 401 when unauthenticated`, async ({ page }) => {
      const response = await page.request[ep.method.toLowerCase() as "get"](ep.path, {
        headers: { "Content-Type": "application/json" },
      });
      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.error).toBeTruthy();
    });
  }

  test("POST to create resource returns 401 when unauthenticated", async ({ page }) => {
    const response = await page.request.post(`${API_BASE}/properties`, {
      data: { name: "Test Property" },
    });
    expect(response.status()).toBe(401);
  });

  test("PUT to update resource returns 401 when unauthenticated", async ({ page }) => {
    const response = await page.request.put(`${API_BASE}/properties/fake-id`, {
      data: { name: "Updated" },
    });
    expect(response.status()).toBe(401);
  });

  test("DELETE returns 401 when unauthenticated", async ({ page }) => {
    const response = await page.request.delete(`${API_BASE}/properties/fake-id`);
    expect(response.status()).toBe(401);
  });
});
