---
name: Vite BASE_PATH production build fix
description: Why every trip-hub publish was silently failing and serving stale dist/
---

## The Rule
Never throw when `BASE_PATH` is missing in `vite.config.ts`. Default to `"/"` during builds.

**Why:** Replit's production build environment does NOT inject `[services.env]` vars from `artifact.toml` into the build command. Only the dev run command gets those env vars. So `BASE_PATH` was always `undefined` during `vite build`, causing the config to throw, the build to silently fail, and Replit to serve the last successfully-built `dist/public` — which was always stale.

**How to apply:** In `artifacts/trip-hub/vite.config.ts`, the fix is:
```js
// WRONG — throws in production CI
const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error('...');

// CORRECT — defaults to '/' when env var absent
const basePath = process.env.BASE_PATH ?? '/';
```

The app is always served at root (`/`) in production so defaulting to `'/'` is always correct.

**Symptom:** User reports "changes in preview don't appear in the published app" and "pictures get broken after publish." Every publish call triggers a failed build; Replit silently serves the previous dist/.
