import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Runner integration tests launch real Node processes. Keep other test files
  // from competing with them for CPU under the existing five-second deadline.
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"], maxWorkers: 1 },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
