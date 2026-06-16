---
name: typescript-setup
description: How to type-check e2e files; root node_modules has no tsc; use server's TypeScript binary
metadata:
  type: reference
---

The root `tsconfig.json` includes `"e2e/**/*.ts"` and `"playwright.config.ts"` — e2e files are covered by this config.

**Root `node_modules`** only contains `@playwright/test` and `dotenv`. There is no `typescript` package at the root.

**To type-check e2e files**, use the TypeScript binary from the server package:
```
node server/node_modules/typescript/bin/tsc --noEmit --project tsconfig.json
```
Run from the repo root. Zero output means no type errors.

**Root tsconfig compiler options** (relevant to e2e):
- `target`: ES2022
- `module`: CommonJS
- `moduleResolution`: Node
- `strict`: true
- `types`: ["node"]
- `baseUrl`: `.` (repo root)
