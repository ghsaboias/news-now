module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react/display-name': 'off',
    // Add more base rules
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'import/order': ['warn', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { order: 'asc' }
    }]
  },
  overrides: [
    {
      // Test files
      files: [
        '**/__tests__/**/*.[jt]s?(x)',
        '**/__mocks__/**/*.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
        '**/test/**/*.[jt]s?(x)',
        'src/setupTests.[jt]s?(x)'
      ],
      env: {
        'jest': true,
        'jest/globals': true
      },
      extends: ['plugin:jest/recommended'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/prefer-as-const': 'off',
        'import/no-anonymous-default-export': 'off',
        'react/display-name': 'off',
        'no-console': 'off',
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error'
      }
    },
    {
      // Development utilities
      files: ['**/utils/performance.ts', '**/hooks/usePerformanceMonitor.ts'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ],
  env: {
    'jest': true,
    'browser': true,
    'node': true
  },
  plugins: ['jest']
}; 