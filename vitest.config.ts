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
            // Coverage thresholds set at 90% to maintain high code quality while allowing
            // for reasonable fluctuations. These act as a safety net - the CI also fails
            // if coverage decreases from the base branch, providing more granular protection.
            thresholds: {
                lines: 90,
                branches: 90,
                functions: 90,
                statements: 90,
            },
        },
    },
});
