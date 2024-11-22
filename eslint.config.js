import globals from "globals"
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    rules: {
      semi: ['error', 'never'], // 禁用句末分号
    }
  },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
]