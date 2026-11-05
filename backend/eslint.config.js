import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys";
import unusedImports from "eslint-plugin-unused-imports";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "src/db/migrations/**"]),

  { files: ["**/*.ts"] },
  { languageOptions: { globals: { ...globals.node } } },

  // Base JS/ES rules
  js.configs.recommended,
  {
    rules: {
      curly: ["error", "multi"],
      "no-console": "warn",
      "no-extra-boolean-cast": "error",
      "arrow-body-style": ["error", "as-needed"],
      "no-unneeded-ternary": "error",
      "no-unused-vars": "off",
      "object-shorthand": "error",
    },
  },

  // TypeScript rules
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // Custom plugins rules
  {
    plugins: {
      "@stylistic": stylistic,
      "prefer-arrow-functions": preferArrowFunctions,
      "sort-destructure-keys": sortDestructureKeys,
      "unused-imports": unusedImports,
    },
    rules: {
      "@stylistic/no-multi-spaces": "warn",
      "@stylistic/no-multiple-empty-lines": ["warn", { max: 1 }],
      "@stylistic/no-trailing-spaces": "warn",
      "@stylistic/object-curly-spacing": ["warn", "always"],
      "prefer-arrow-functions/prefer-arrow-functions": "error",
      "sort-destructure-keys/sort-destructure-keys": "warn",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Must be last: disables rules that conflict with Prettier
  eslintConfigPrettier,
]);
