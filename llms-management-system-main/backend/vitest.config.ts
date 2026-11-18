import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    hookTimeout: 600000,
    testTimeout: 60000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
