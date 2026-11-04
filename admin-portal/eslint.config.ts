import js from "@eslint/js";
import stylisticJs from "@stylistic/eslint-plugin";
import tanstackRouter from "@tanstack/eslint-plugin-router";
import type { ESLint } from "eslint";
import { defineConfig } from "eslint/config";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
// @ts-expect-error -- No types available
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import ts from "typescript-eslint";
import { parser } from "typescript-eslint";

export default defineConfig([
  { settings: { react: { version: "detect" } } },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },

  // Base JS/ES rules
  {
    plugins: { js },
    rules: {
      ...js.configs.recommended.rules,
      "arrow-body-style": ["error", "always"],
      curly: "warn",
      "no-console": "warn",
      "no-extra-boolean-cast": "error",
      "no-nested-ternary": "error",
      "no-unneeded-ternary": "error",
      "no-unused-vars": "off",
      "object-shorthand": "warn",
    },
  },

  // React rules
  {
    plugins: { react },
    rules: {
      ...react.configs.recommended.rules,
      "react/hook-use-state": "warn",
      "react/jsx-curly-brace-presence": "warn",
      "react/jsx-no-leaked-render": "warn",
      "react/jsx-no-useless-fragment": "warn",
      "react/jsx-sort-props": [
        "warn",
        {
          callbacksLast: true,
          shorthandLast: true,
          reservedFirst: true,
          ignoreCase: true,
        },
      ],
      "react/react-in-jsx-scope": "off",
      "react/self-closing-comp": "warn",
      "react/prop-types": "off",
    },
  },

  // TypeScript rules (flat config: spread recommended config directly)
  ...ts.configs.recommended,
  {
    plugins: { "@typescript-eslint": ts.plugin },
    languageOptions: { parser },
    rules: {
      "@typescript-eslint/consistent-type-imports": ["warn"],
      "@typescript-eslint/method-signature-style": ["error", "property"],
      "@typescript-eslint/consistent-type-definitions": ["warn", "type"],
      "@typescript-eslint/no-unused-vars": ["error", { enableAutofixRemoval: { imports: true } }],
    },
  },

  // Custom plugins rules
  {
    plugins: {
      "@stylistic": stylisticJs,
      "@tanstack/router": tanstackRouter as unknown as ESLint.Plugin,
      "react-hooks": reactHooks as ESLint.Plugin,
      "simple-import-sort": simpleImportSort,
      "sort-destructure-keys": sortDestructureKeys,
      unicorn,
      "prefer-arrow-functions": preferArrowFunctions as ESLint.Plugin,
    },
    rules: {
      "@stylistic/no-multi-spaces": "warn",
      "@stylistic/no-multiple-empty-lines": ["warn", { max: 1 }],
      "@stylistic/no-trailing-spaces": "warn",
      "@stylistic/object-curly-spacing": ["warn", "always"],
      "@stylistic/padding-line-between-statements": [
        "warn",
        { blankLine: "always", prev: "*", next: "return" },
      ],
      "@tanstack/router/create-route-property-order": "error",
      "prefer-arrow-functions/prefer-arrow-functions": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "simple-import-sort/exports": "warn",
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            // Packages. `react` related packages come first.
            ["^react", "^@?\\w"],

            // Internal packages and relative paths.
            [
              "^(@/.*)(/.*|$)",

              // Side effect imports.
              "^\\u0000",

              // Parent imports. Put `..` last.
              "^\\.\\.(?!/?$)",
              "^\\.\\./?$",
              // Other relative imports. Put same-folder imports and `.` last.
              "^\\./(?=.*/)(?!/?$)",
              "^\\.(?!/?$)",
              "^\\./?$",
            ],

            // Style imports.
            ["^.+\\.s?css$"],
          ],
        },
      ],
      "sort-destructure-keys/sort-destructure-keys": "warn",
      "unicorn/filename-case": ["error", { case: "kebabCase" }],
    },
  },

  {
    plugins: { "better-tailwindcss": betterTailwindcss },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/styles.css",
      },
    },
  },
]);
