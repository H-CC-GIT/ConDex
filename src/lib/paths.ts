import fs from "fs";
import path from "path";

export function dataDir() {
  const configured = process.env.DATA_DIR?.trim();
  if (configured) return path.resolve(/*turbopackIgnore: true*/ configured);
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
}

export function photosDir() {
  return path.join(/*turbopackIgnore: true*/ dataDir(), "photos");
}

export function ensureDataDirs() {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(photosDir(), { recursive: true });
}
