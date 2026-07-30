import { Router, type IRouter } from "express";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Everything compiles into dist/index.mjs (one flat bundle), so __dirname is
// the dist/ folder — one level up reaches public/images correctly.
const IMAGES_DIR = path.resolve(__dirname, "../public/images");

const router: IRouter = Router();

/** Returns all jordan-*.jpg files — no DB required, just the filesystem. */
router.get("/images/birthday-photos", (_req, res): void => {
  try {
    const files = readdirSync(IMAGES_DIR)
      .filter((f) => /^jordan-.+\.jpe?g$/i.test(f))
      .sort();
    res.json(files.map((f) => `/api/images/${f}`));
  } catch {
    res.json([]);
  }
});

/** Returns all group-*.jpg files — no DB required, just the filesystem. */
router.get("/images/group-photos", (_req, res): void => {
  try {
    const files = readdirSync(IMAGES_DIR)
      .filter((f) => /^group-.+\.jpe?g$/i.test(f))
      .sort();
    res.json(files.map((f) => `/api/images/${f}`));
  } catch {
    res.json([]);
  }
});

export default router;
