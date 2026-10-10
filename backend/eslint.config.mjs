import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // Regla de Clean Architecture verificada por el linter: el dominio no conoce librerías externas.
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@prisma/*',
            'fastify',
            '@fastify/*',
            '@aws-sdk/*',
            'zod',
            'awilix',
            '**/infrastructure/**',
            '**/application/**',
            '**/presentation/**',
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@prisma/*', 'fastify', '@fastify/*', '@aws-sdk/*', '**/infrastructure/**', '**/presentation/**'] },
      ],
    },
  },
);
