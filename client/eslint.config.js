import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
    // Игнорируемые файлы
    {
        ignores: ['build/**', 'dist/**', 'node_modules/**', 'rspack.config.js'],
    },

    // Базовые правила JS
    js.configs.recommended,

    // TypeScript правила
    ...tseslint.configs.recommended,

    // React Hooks
    {
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
        },
    },

    // Общие настройки для проекта
    {
        languageOptions: {
            globals: {
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                console: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                WebSocket: 'readonly',
                HTMLElement: 'readonly',
                Event: 'readonly',
                process: 'readonly',
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        rules: {
            // Разрешаем неиспользуемые переменные с _ префиксом
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
            // Разрешаем any (постепенно убирать)
            '@typescript-eslint/no-explicit-any': 'warn',
            // Разрешаем require() в .js файлах
            '@typescript-eslint/no-require-imports': 'off',
        },
    },

    // Prettier должен быть последним — отключает конфликтующие правила
    eslintConfigPrettier,
);
