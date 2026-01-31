import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["src/**/*.test.ts", "src/**/*.spec.ts", "tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "json-summary", "html"],
            exclude: [
                "node_modules/",
                "dist/",
                "src/**/*.test.ts",
                "src/**/*.spec.ts",
                "tests/**/*.test.ts",
                "tests/helpers/**",
                "vitest.config.ts",
            ],
        },
    },
});
