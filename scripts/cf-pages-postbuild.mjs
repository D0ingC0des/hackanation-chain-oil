/**
 * Postbuild for Cloudflare Pages.
 * - Copies dist/server/server.js  → dist/client/_worker.js
 * - Copies dist/server/assets/    → dist/client/assets/  (worker runtime imports)
 */
import { copyFileSync, cpSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const root = process.cwd();
const serverDir = join(root, "dist/server");
const clientDir = join(root, "dist/client");

if (!existsSync(join(serverDir, "server.js"))) {
  console.error("dist/server/server.js not found — run `npm run build` first");
  process.exit(1);
}

mkdirSync(clientDir, { recursive: true });

copyFileSync(join(serverDir, "server.js"), join(clientDir, "_worker.js"));
console.log("✓ _worker.js");

const serverAssets = join(serverDir, "assets");
if (existsSync(serverAssets)) {
  const clientAssets = join(clientDir, "assets");
  mkdirSync(clientAssets, { recursive: true });
  cpSync(serverAssets, clientAssets, { recursive: true, force: true });
  console.log("✓ server assets copied to dist/client/assets/");
}

console.log("Cloudflare Pages postbuild done.");
