import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.js",
      "esbuild.config.mjs",
      "**/.history/**",
      "src/CalendarView_class.ts",
      "src/CalendarView_raw.ts",
    ],
  },
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
      // Obsidian-specific rules
      "obsidianmd/ui/sentence-case": ["warn", { allowAutoFix: true }],
      "obsidianmd/no-static-styles-assignment": "warn",
      "obsidianmd/sample-names": "off",
      // Unsafe rules — too noisy without strict typing setup
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      // Required by Obsidian plugin review
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none" }],
      "no-useless-escape": "error",
      "no-empty": "error",
      "no-undef": "off",
      // moment is bundled with Obsidian — suppress the import restriction
      "no-restricted-imports": "off",
    },
  },
]);
