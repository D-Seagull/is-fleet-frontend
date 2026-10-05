import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests only (pure lib logic). Node environment — no jsdom needed until
// component tests are added.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
