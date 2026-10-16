import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const staticSource = join(root, ".next", "static");
const publicSource = join(root, "public");

if (!existsSync(standalone)) {
  console.warn("Standalone output was not found; skipping asset copy.");
  process.exit(0);
}

if (existsSync(staticSource)) {
  const staticTarget = join(standalone, ".next", "static");
  mkdirSync(dirname(staticTarget), { recursive: true });
  cpSync(staticSource, staticTarget, { recursive: true, force: true });
}

if (existsSync(publicSource)) {
  cpSync(publicSource, join(standalone, "public"), { recursive: true, force: true });
}

console.log("Standalone server assets copied. Start with: npm run start");
