import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';

export default [
    eslint.configs.recommended,
    {
        files: ['packages/*/src/**/*.ts'],
        ignores: ['**/*.test.ts', '**/*.spec.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                project: [
                    './packages/core/tsconfig.json',
                    './packages/cli/tsconfig.json',
                    './packages/stdlib/tsconfig.json',
                ],
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // Disable base rule and use TypeScript version
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            // TypeScript specific rules
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-non-null-assertion': 'error',

            // General rules
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
    {
        files: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.spec.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // Disable base rule and use TypeScript version
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],

            // TypeScript specific rules
            '@typescript-eslint/no-explicit-any': 'error',

            // General rules
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
    {
        files: ['packages/cli/src/**/*.ts'],
        rules: {
            // CLI can use console
            'no-console': 'off',
        },
    },
    {
        files: ['scripts/**/*.ts'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            'no-console': 'off', // Scripts can use console
            'prefer-const': 'error',
            'no-var': 'error',
        },
    },
    prettierConfig,
];
