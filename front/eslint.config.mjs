import js from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import tseslint from "typescript-eslint";

export default defineConfig(
    { ignores: ["build/**", "src/api/generated/**"] },
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: { projectService: { allowDefaultProject: ["eslint.config.mjs"] } },
        },
    },
    {
        files: ["src/**/*.{ts,tsx}"],
        extends: [
            eslintReact.configs["recommended-type-checked"],
            jsxA11y.configs.recommended,
        ],
    },
    {
        plugins: { import: importX },
        rules: {
            "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
            "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false } }],
            "@typescript-eslint/no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
            "import/first": "error",
            "import/no-duplicates": "error",
            // Browser globals that read like local variables (`name`, `status`, `event`, …).
            "no-restricted-globals": ["error",
                "addEventListener", "blur", "close", "closed", "confirm", "defaultStatus", "defaultstatus",
                "event", "external", "find", "focus", "frameElement", "frames", "history", "innerHeight",
                "innerWidth", "length", "location", "locationbar", "menubar", "moveBy", "moveTo", "name",
                "onblur", "onerror", "onfocus", "onload", "onresize", "onunload", "open", "opener", "opera",
                "outerHeight", "outerWidth", "pageXOffset", "pageYOffset", "parent", "print",
                "removeEventListener", "resizeBy", "resizeTo", "screen", "screenLeft", "screenTop", "screenX",
                "screenY", "scroll", "scrollbars", "scrollBy", "scrollTo", "scrollX", "scrollY", "self",
                "status", "statusbar", "stop", "toolbar", "top",
            ],
        },
    },
    {
        files: ["src/shared/**"],
        ignores: ["**/*.test.{ts,tsx}"],
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [{ group: ["**/features/**"], message: "shared/ never imports features/." }],
            }],
        },
    },
);
