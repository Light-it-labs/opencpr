module.exports = {
  "frontend/src/**/*.{ts,tsx}": [
    "pnpm --dir frontend exec eslint --fix --max-warnings 0",
    "pnpm --dir frontend exec prettier --write",
  ],
  "admin-portal/src/**/*.{ts,tsx}": [
    "pnpm --dir admin-portal exec eslint --fix --max-warnings 0",
    "pnpm --dir admin-portal exec prettier --write",
  ],
  "backend/**/*.ts": [
    "pnpm --dir backend exec eslint --fix",
    "pnpm --dir backend exec prettier --write",
  ],
};
