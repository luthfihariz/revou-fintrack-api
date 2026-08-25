module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist/', 'node_modules/', 'prisma/'],
  overrides: [
    {
      files: ['src/**/*.ts', 'apps/**/*.ts', 'libs/**/*.ts', 'test/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
      ],
    },
  ],
};