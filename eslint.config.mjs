import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // React Hook 의존성 배열 경고 무시 (일부는 의도적으로 제외)
      "react-hooks/exhaustive-deps": "warn",
      // 사용하지 않는 변수 경고 무시 (일부는 의도적으로 주석 처리)
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];

export default eslintConfig;
