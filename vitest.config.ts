import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["packages/*/src/**/*.test.ts", "packages/*/src/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "json-summary", "html"],
            exclude: [
                "node_modules/",
                "packages/*/dist/",
                "packages/*/src/**/*.test.ts",
                "packages/*/src/**/*.spec.ts",
            ],
            thresholds: {
                lines: 80,
                branches: 80,
                functions: 90,
                statements: 80,
            },
        },
    },
});
