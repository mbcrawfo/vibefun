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
                "**/node_modules/**",
                "**/dist/**",
                "**/*.test.ts",
                "**/*.spec.ts",
                "scripts/**",
                "**/vitest.config.ts",
                "**/coverage/**",
                // Type-only files with no executable code
                "**/types/ast.ts",
                "**/types/core-ast.ts",
            ],
            // Coverage thresholds set as a safety net. The CI also checks for coverage
            // decreases from the base branch, which provides the main protection against
            // coverage regression. These thresholds reflect the combined coverage across
            // all packages, with margin for minor environment differences.
            thresholds: {
                lines: 88,
                branches: 81,
                functions: 88,
                statements: 88,
            },
        },
    },
});
