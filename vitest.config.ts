import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html'],
            exclude: [
                'node_modules/',
                'packages/*/dist/',
                'packages/*/src/**/*.test.ts',
                'packages/*/src/**/*.spec.ts',
            ],
            // Coverage thresholds set below current coverage (79.36% lines) to allow
            // for minor fluctuations while preventing significant coverage drops.
            // These act as a safety net - the CI also fails if coverage decreases
            // from the base branch, providing more granular protection.
            thresholds: {
                lines: 75,
                branches: 75,
                functions: 90,
                statements: 75,
            },
        },
    },
});
