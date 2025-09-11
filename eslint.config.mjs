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
      // React Hook 의존성 배열 경고를 오류로 변경 (빌드 실패 방지)
      "react-hooks/exhaustive-deps": "error",
      // 사용하지 않는 변수 경고를 오류로 변경 (빌드 실패 방지)
      "@typescript-eslint/no-unused-vars": "error",
      // any 타입 사용 금지
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
