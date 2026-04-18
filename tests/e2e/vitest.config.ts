import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["**/*.test.ts"],
        // CLI spawns can compile + node-boot for several seconds each; real-
        // world tests sometimes chain multiple spawns. Generous default keeps
        // local and CI runs green without per-test overrides.
        testTimeout: 60_000,
        hookTimeout: 30_000,
        // Parallel execution is fine — each test manages its own tempdir.
        reporters: ["default"],
    },
});
