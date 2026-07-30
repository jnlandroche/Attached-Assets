---
name: API server bundle path resolution
description: How to correctly resolve paths to public/images from route files, given the esbuild single-bundle output
---

# API Server Bundle Path Resolution

The API server build (`build.mjs` → esbuild) bundles **all source files into a single `dist/index.mjs`**. There are no separate `dist/routes/*.mjs` files.

## The rule

Any `import.meta.url` / `fileURLToPath` usage in a route file will resolve to `dist/index.mjs` at runtime — **not** to the original source file path.

| Source path | Compiled location | Correct relative path to `public/images` |
|---|---|---|
| `src/routes/images.ts` | `dist/index.mjs` | `../public/images` (one level up from `dist/`) |

**Wrong:** `path.resolve(__dirname, "../../public/images")` — walks two levels up past the `api-server/` root into `artifacts/`  
**Right:** `path.resolve(__dirname, "../public/images")` — one level up from `dist/` lands in `api-server/public/images/`

**Why:** The dev script is `pnpm run build && pnpm run start` — there is no `tsx` watch mode. Every run goes through the esbuild bundle step first, so the running code is always the bundled `dist/index.mjs`.

## How to apply

Whenever adding a new route file that needs to reference the filesystem (images, uploads, etc.), use `../` not `../../` from `__dirname`.
