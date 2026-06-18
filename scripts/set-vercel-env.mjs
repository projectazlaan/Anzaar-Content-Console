#!/usr/bin/env node
/**
 * set-vercel-env.mjs
 * Reads .env.local and pushes all variables to Vercel using CLI
 * Run: node scripts/set-vercel-env.mjs
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

// Parse .env.local
const envContent = readFileSync(envPath, "utf8");
const vars = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  // Remove surrounding quotes
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  vars[key] = val;
}

const envs = ["production", "preview", "development"];

let ok = 0;
let fail = 0;

for (const [key, val] of Object.entries(vars)) {
  try {
    // Remove existing first (ignore error if not exists)
    try {
      execSync(`echo "" | npx vercel env rm ${key} production --yes 2>/dev/null`, { stdio: "pipe" });
      execSync(`echo "" | npx vercel env rm ${key} preview --yes 2>/dev/null`, { stdio: "pipe" });
      execSync(`echo "" | npx vercel env rm ${key} development --yes 2>/dev/null`, { stdio: "pipe" });
    } catch (_) {}

    // Add to all environments
    // Use printf to handle special chars / newlines properly
    const escaped = val.replace(/'/g, "'\\''");
    execSync(
      `printf '%s' '${escaped}' | npx vercel env add ${key} production preview development`,
      { stdio: "pipe", shell: "/bin/zsh" }
    );
    console.log(`✅ ${key}`);
    ok++;
  } catch (err) {
    console.error(`❌ ${key}: ${err.message?.slice(0, 100)}`);
    fail++;
  }
}

console.log(`\n=== Done: ${ok} set, ${fail} failed ===`);
if (fail === 0) {
  console.log("🚀 Now run: npx vercel --prod  (to redeploy)");
}
