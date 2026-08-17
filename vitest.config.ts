import { defineConfig } from "vitest/config";
import { resolve } from "path";

/**
 * Minimal Vitest config for unit-testing pure, isomorphic helpers under src/lib.
 * Uses the project's existing tsconfig path aliases (@/ -> src).
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
