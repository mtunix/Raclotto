import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

export default [
    {
        ignores: ["**/node_modules/**", "build/**", "dist/**"],
    },
    ...compat.extends("eslint-config-react-app"),
    {
        rules: {
            "@typescript-eslint/no-useless-constructor": "off",
            "no-useless-constructor": "off"
        }
    }
];