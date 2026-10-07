// @ts-check
const { defineConfig } = require('eslint/config')
const angular = require('angular-eslint')
const rootConfig = require('../eslint.config.js')

module.exports = defineConfig([
  ...rootConfig,
  {
    files: ['**/*.ts'],
    extends: [angular.configs.tsAll],
    languageOptions: {
      parserOptions: {
        project: ['./cases/tsconfig.strict.json', './tsconfig.app.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateAll],
  },
])
