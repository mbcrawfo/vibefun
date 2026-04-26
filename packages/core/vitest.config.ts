import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['../../vitest.setup.ts'],
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'json-summary', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/test-arbitraries/**',
                'vitest.config.ts',
                '../../vitest.setup.ts',
            ],
        },
    },
});
