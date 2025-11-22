import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        passWithNoTests: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
            ],
        },
    },
});
