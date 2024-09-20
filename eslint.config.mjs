import globals from 'globals';
import pluginJs from '@eslint/js';
import google from 'eslint-config-google';

export default [
    {
        files: ['eslint.config.mjs', 'main.js', 'lib/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.commonjs,
                ...globals.es2021,
            },
        },
        ...pluginJs.configs.recommended,
        ...google,
        rules: {
            'indent': ['error', 4],
            'max-len': [
                'error',
                {
                    code: 125,
                    ignoreComments: true,
                    ignoreUrls: true,
                    ignoreStrings: true,
                },
            ],
            'quotes': [
                'error',
                'single',
            ],
            'no-var': 'error',
            'semi': [
                'error',
                'always',
            ],
        },
    },
];