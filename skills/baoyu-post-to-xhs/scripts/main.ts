import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, type BrowserContext } from "playwright";

const DEFAULT_URL =
  "https://creator.xiaohongshu.com/publish/publish?source=official";

function defaultProfileDir(): string {
  return (
    process.env.BAOYU_XHS_PROFILE_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || ".", ".baoyu-skills", "xhs-playwright-profile")
  );
}

function collectImages(argv: {
  imagePaths: string[];
  imagesDir?: string;
}): string[] {
  const out: string[] = [];
  for (const p of argv.imagePaths) {
    const abs = path.resolve(p);
    if (!fs.existsSync(abs)) throw new Error(`Image not found: ${abs}`);
    out.push(abs);
  }
  if (argv.imagesDir) {
    const dir = path.resolve(argv.imagesDir);
    if (!fs.statSync(dir).isDirectory()) {
      throw new Error(`Not a directory: ${dir}`);
    }
    const names = fs.readdirSync(dir);
    const imgs = names
      .filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const n of imgs) {
      out.push(path.join(dir, n));
    }
  }
  return out;
}

function parseArgs(argv: string[]): {
  url: string;
  profileDir: string;
  headless: boolean;
  title?: string;
  body?: string;
  imagePaths: string[];
  imagesDir?: string;
  openOnly: boolean;
  dryRun: boolean;
} {
  let url = DEFAULT_URL;
  let profileDir = defaultProfileDir();
  let headless = false;
  let title: string | undefined;
  let body: string | undefined;
  const imagePaths: string[] = [];
  let imagesDir: string | undefined;
  let openOnly = false;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--help" || a === "-h") {
      printUsage(0);
    }
    if (a === "--url" && argv[i + 1]) {
      url = argv[++i]!;
      continue;
    }
    if (a === "--profile" && argv[i + 1]) {
      profileDir = path.resolve(argv[++i]!);
      continue;
    }
    if (a === "--headless") {
      headless = true;
      continue;
    }
    if (a === "--title" && argv[i + 1]) {
      title = argv[++i]!;
      continue;
    }
    if (a === "--body" && argv[i + 1]) {
      body = argv[++i]!;
      continue;
    }
    if (a === "--body-file" && argv[i + 1]) {
      const fp = path.resolve(argv[++i]!);
      body = fs.readFileSync(fp, "utf-8");
      continue;
    }
    if (a === "--image" && argv[i + 1]) {
      imagePaths.push(argv[++i]!);
      continue;
    }
    if (a === "--images-dir" && argv[i + 1]) {
      imagesDir = argv[++i]!;
      continue;
    }
    if (a === "--open-only") {
      openOnly = true;
      continue;
    }
    if (a === "--dry-run") {
      dryRun = true;
      continue;
    }
    console.error(`Unknown argument: ${a}`);
    printUsage(1);
  }

  return {
    url,
    profileDir,
    headless,
    title,
    body,
    imagePaths,
    imagesDir,
    openOnly,
    dryRun,
  };
}

function printUsage(code: number): never {
  console.log(`Xiaohongshu creator assist (Playwright). Opens the official publish page; you log in and publish manually.

Usage:
  npx -y bun main.ts [options]

Options:
  --url <url>           Publish page URL (default: creator publish)
  --profile <dir>       Persistent browser profile (default: ~/.baoyu-skills/xhs-playwright-profile or BAOYU_XHS_PROFILE_DIR)
  --headless            Run headless (default: headed for login)
  --title <text>        Best-effort title fill (may fail if UI changes)
  --body <text>         Best-effort description fill
  --body-file <path>    Read description from file (utf-8)
  --image <path>        Image file (repeatable)
  --images-dir <dir>    All png/jpg/gif/webp in directory (sorted)
  --open-only           Only open the page (no auto fill/upload)
  --dry-run             Print actions and exit without launching browser
  --help                Show help

Environment:
  BAOYU_XHS_PROFILE_DIR   Override default profile directory

Compliance:
  This tool does not bypass login or schedule mass posting. Complete publish in the browser yourself.
`);
  process.exit(code);
}

async function tryFillTitle(page: import("playwright").Page, title: string): Promise<boolean> {
  const attempts: Array<() => Promise<boolean>> = [
    async () => {
      const loc = page.getByPlaceholder(/标题|添加标题|概括/i).first();
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await loc.click({ timeout: 3000 });
      await loc.fill(title);
      return true;
    },
    async () => {
      const loc = page.locator('[contenteditable="true"]').first();
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await loc.click({ timeout: 3000 });
      await loc.fill(title);
      return true;
    },
    async () => {
      const loc = page.locator("textarea").first();
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await loc.click({ timeout: 3000 });
      await loc.fill(title);
      return true;
    },
  ];
  for (const run of attempts) {
    try {
      if (await run()) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function tryFillBody(page: import("playwright").Page, text: string): Promise<boolean> {
  const attempts: Array<() => Promise<boolean>> = [
    async () => {
      const loc = page.getByPlaceholder(/正文|添加正文|描述|笔记/i).first();
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await loc.click({ timeout: 3000 });
      await loc.fill(text);
      return true;
    },
    async () => {
      const loc = page.locator('[contenteditable="true"]').nth(1);
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await loc.click({ timeout: 3000 });
      await loc.fill(text);
      return true;
    },
    async () => {
      const loc = page.locator("textarea").nth(1);
      await loc.waitFor({ state: "visible", timeout: 8000 });
      await loc.click({ timeout: 3000 });
      await loc.fill(text);
      return true;
    },
  ];
  for (const run of attempts) {
    try {
      if (await run()) return true;
    } catch {
      /* try next */
    }
  }
  return false;
}

async function tryUploadImages(
  page: import("playwright").Page,
  files: string[],
): Promise<boolean> {
  if (files.length === 0) return false;
  const input = page.locator('input[type="file"]').first();
  try {
    await input.waitFor({ state: "attached", timeout: 15000 });
    await input.setInputFiles(files);
    return true;
  } catch {
    return false;
  }
}

function keepAlive(context: BrowserContext): void {
  const shutdown = async () => {
    try {
      await context.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.dryRun) {
    console.log(
      JSON.stringify(
        {
          url: opts.url,
          profileDir: opts.profileDir,
          headless: opts.headless,
          title: opts.title,
          hasBody: Boolean(opts.body),
          images: collectImages({
            imagePaths: opts.imagePaths,
            imagesDir: opts.imagesDir,
          }).length,
          openOnly: opts.openOnly,
        },
        null,
        2,
      ),
    );
    return;
  }

  fs.mkdirSync(opts.profileDir, { recursive: true });

  const images = opts.openOnly
    ? []
    : collectImages({
        imagePaths: opts.imagePaths,
        imagesDir: opts.imagesDir,
      });

  console.error(`[xhs] Profile: ${opts.profileDir}`);
  console.error(`[xhs] Opening: ${opts.url}`);

  const channel = process.env.BAOYU_XHS_CHROME_CHANNEL;
  const context = await chromium.launchPersistentContext(opts.profileDir, {
    headless: opts.headless,
    ...(channel && channel !== "0" ? { channel: channel as "chrome" } : {}),
    args: ["--disable-blink-features=AutomationControlled"],
    viewport: { width: 1280, height: 900 },
  });

  keepAlive(context);

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(opts.url, { waitUntil: "domcontentloaded", timeout: 120000 });

  console.error(
    "[xhs] Log in in the browser if prompted. This skill does not auto-publish — review and click publish yourself.",
  );

  if (!opts.openOnly) {
    if (images.length > 0) {
      const ok = await tryUploadImages(page, images);
      console.error(
        ok
          ? `[xhs] Uploaded ${images.length} image(s) via file input (if the page accepted them).`
          : "[xhs] Could not attach images automatically; add images manually in the UI.",
      );
    }
    if (opts.title) {
      const tOk = await tryFillTitle(page, opts.title);
      console.error(
        tOk ? "[xhs] Title filled (best effort)." : "[xhs] Title not filled automatically; enter manually.",
      );
    }
    if (opts.body) {
      const bOk = await tryFillBody(page, opts.body);
      console.error(
        bOk
          ? "[xhs] Description filled (best effort)."
          : "[xhs] Description not filled automatically; enter manually.",
      );
    }
  }

  const result = {
    ok: true,
    url: opts.url,
    profileDir: opts.profileDir,
    note: "Complete publishing in the browser. Close the browser or press Ctrl+C to exit.",
  };
  console.log(JSON.stringify(result, null, 2));

  await new Promise<void>(() => {});
}

await main().catch((e) => {
  console.error(`[xhs] Error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
