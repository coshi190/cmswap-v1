import { FlatCompat } from '@eslint/eslintrc'
import tseslint from 'typescript-eslint'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
    baseDirectory: __dirname,
})

export default tseslint.config(
    {
        ignores: ['node_modules/', '.next/', 'out/', 'build/'],
    },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            'prefer-const': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    }
)
