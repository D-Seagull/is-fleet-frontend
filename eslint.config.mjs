import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // `react-hooks/set-state-in-effect` (React Compiler) flags the idiomatic
    // "seed local form state from freshly-fetched server data" pattern used in
    // our edit forms (account, settings, driver detail). That's an advisory,
    // not a bug here — keep it visible as a warning without failing the build.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // shadcn/ui primitives are vendored, generated files — we don't hand-author
    // them, so we don't hold them to the same lint bar as our own code.
    files: ["src/components/ui/**"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
