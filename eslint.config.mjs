import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["build/", "public/", "coverage/"] },
  ...tseslint.configs.recommended,
);
