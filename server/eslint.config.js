import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
    // Игнорируемые файлы
    {
        ignores: ['node_modules/**'],
    },

    // Базовые правила JS
    js.configs.recommended,

    // Настройки для Node.js
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                URL: 'readonly',
            },
        },
        rules: {
            // Разрешаем неиспользуемые переменные с _ префиксом
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },

    // Prettier должен быть последним
    eslintConfigPrettier,
];
