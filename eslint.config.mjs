import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import js from "@eslint/js";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/*.js", "esbuild.config.mjs"],
  },
  js.configs.recommended,
  ...obsidianmd.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        console: "readonly",
        document: "readonly",
        window: "readonly",
        setTimeout: "readonly",
        getComputedStyle: "readonly",
      },
    },
    rules: {
      // Enable auto-fix friendly rules
      "obsidianmd/ui/sentence-case": ["warn", { allowAutoFix: true }],
      "obsidianmd/no-static-styles-assignment": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-useless-escape": "off",
      "no-undef": "off",
      "no-empty": "off",
    },
  },
]);
