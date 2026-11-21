// Production-bundle smoke test: builds are assumed present (`npm run build`).
// Starts `vite preview`, loads key routes in Chromium, and fails on JS errors.
// Usage: node scripts/verify-preview.mjs
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 4174;
const BASE = `http://localhost:${PORT}`;

const server = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  cwd: root,
  shell: true,
  stdio: "ignore",
});

const stop = () => {
  if (!server.pid) return;
  if (process.platform === "win32") {
    // `shell: true` spawns cmd.exe; kill the whole tree so vite does not orphan.
    try {
      execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      /* already gone */
    }
    return;
  }
  try {
    server.kill();
  } catch {
    /* already gone */
  }
};
process.on("exit", stop);
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});

async function waitForServer(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(BASE, { redirect: "manual" });
      const html = response.ok ? await response.text() : "";
      if (html.includes("/assets/index-")) return;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error("vite preview did not start");
}

const checks = [
  { path: "/", heading: /FIND YOUR/i },
  { path: "/explore", heading: /EXPLORE/i },
  { path: "/live-music", heading: /LIVE MUSIC/i },
  { path: "/studios", heading: /ห้องซ้อมดนตรี/ },
  { path: "/locations/wat-arun", heading: /วัดอรุณ/ },
  { path: "/find-my-vibe", heading: /FIND MY/i },
  { path: "/about", heading: /NO FAKE/i },
  { path: "/nope-not-a-route", heading: /หลุดเฟรม/ },
];

let failures = 0;
try {
  await waitForServer();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    // Chrome deprecation noise and blocked third-party images are not app errors.
    if (message.type() !== "error") return;
    if (/Failed to load resource|Permissions policy violation/.test(text)) return;
    errors.push(`console: ${text}`);
  });

  for (const check of checks) {
    errors.length = 0;
    let text = "";
    for (let attempt = 0; attempt < 2 && !text; attempt += 1) {
      await page.goto(`${BASE}${check.path}`, { waitUntil: "load" });
      try {
        await page.waitForSelector("h1", { state: "attached", timeout: 15_000 });
      } catch {
        /* retry once — the preview server may still be warming up */
      }
      text =
        (await page
          .locator("h1")
          .first()
          .textContent()
          .catch(() => "")) ?? "";
    }
    const ok = check.heading.test(text);
    if (!ok) failures += 1;
    if (errors.length > 0) failures += 1;
    console.log(`${ok && errors.length === 0 ? "PASS" : "FAIL"} ${check.path} — "${text.trim().slice(0, 48)}"`);
    for (const error of errors) console.log(`  ${error}`);
  }

  // The map route needs WebGL; assert the canvas mounts in the production bundle.
  await page.goto(`${BASE}/map`, { waitUntil: "load" });
  const canvas = await page
    .waitForSelector(".maplibregl-canvas", { timeout: 20_000 })
    .then(() => 1)
    .catch(() => 0);
  if (canvas === 0) failures += 1;
  console.log(`${canvas > 0 ? "PASS" : "FAIL"} /map — MapLibre canvas mounted`);

  await browser.close();
} catch (error) {
  failures += 1;
  console.error("ERROR", error.message);
} finally {
  stop();
}

console.log(failures === 0 ? "\nPreview smoke: all checks passed" : `\nPreview smoke: ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
