module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true,
    browser: false
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.base.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'import', 'promise'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended',
    'prettier'
  ],
  rules: {
    'import/order': [
      'warn',
      {
        groups: [['builtin', 'external', 'internal'], ['parent', 'sibling', 'index']],
        'newlines-between': 'always'
      }
    ],
    '@typescript-eslint/consistent-type-imports': 'warn'
  },
  ignorePatterns: ['**/dist/**', '**/build/**', 'legacy/**', 'commitlint.config.cjs'],
  overrides: [
    {
      files: ['apps/web/**/*.{ts,tsx}'],
      env: {
        browser: true,
        node: false
      },
      plugins: ['react-hooks', 'jsx-a11y', 'tailwindcss'],
      extends: [
        'plugin:react-hooks/recommended',
        'plugin:jsx-a11y/recommended',
        'plugin:tailwindcss/recommended'
      ],
      settings: {
        tailwindcss: {
          config: 'apps/web/tailwind.config.cjs'
        }
      },
      rules: {
        'tailwindcss/no-custom-classname': 'off'
      }
    }
  ]
};
