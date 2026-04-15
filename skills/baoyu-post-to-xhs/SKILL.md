---
name: baoyu-post-to-xhs
description: Opens 小红书创作中心发布页（Playwright 持久化配置），可辅助上传图片、填写标题/正文（尽力而为）；需用户本人登录并手动点击发布。适用于「小红书」「xhs」「笔记发布」。不用于绕过风控或批量无人值守发布。
version: 1.0.0
metadata:
  openclaw:
    homepage: https://github.com/JimLiu/baoyu-skills#baoyu-post-to-xhs
    requires:
      anyBins:
        - bun
        - npx
---

# Post to Xiaohongshu (小红书)

Browser-assisted workflow for the **official creator publish** page. Uses **Playwright** with a **persistent profile** so you stay logged in across runs (same idea as keeping a normal browser profile).

## Compliance

Read [references/compliance.md](references/compliance.md). This skill **does not** auto-click「发布」 or run unattended bulk posting.

## Prerequisites

From `{baseDir}/scripts` (this skill’s `scripts` folder):

```bash
cd {baseDir}/scripts
bun install
npx playwright install chromium
```

Resolve `${BUN_X}`: `bun` if installed, else `npx -y bun`.

Optional: use system Google Chrome instead of bundled Chromium:

```bash
export BAOYU_XHS_CHROME_CHANNEL=chrome
```

To force bundled Chromium, unset the variable or set `BAOYU_XHS_CHROME_CHANNEL=0`.

## Workflow

1. Prepare images (PNG/JPEG/GIF/WebP) and optional title/body text.
2. Run `main.ts` with `--image` / `--images-dir` and/or `--title` / `--body` / `--body-file`, or use `--open-only` to only open the tab.
3. **Log in** in the opened window if needed (QR code, etc.).
4. **Review** title, body, and images; fix anything the automation missed.
5. **Click publish** yourself in the UI. Stop the CLI with Ctrl+C when finished.

## Commands

```bash
${BUN_X} {baseDir}/scripts/main.ts --images-dir ./cards --title "标题" --body "正文摘要"
${BUN_X} {baseDir}/scripts/main.ts --image ./cover.png --image ./p2.png --title "标题"
${BUN_X} {baseDir}/scripts/main.ts --open-only
${BUN_X} {baseDir}/scripts/main.ts --dry-run
```

| Option | Meaning |
|--------|---------|
| `--url` | Override publish URL (default: official creator publish) |
| `--profile` | Profile directory (default: `~/.baoyu-skills/xhs-playwright-profile` or `BAOYU_XHS_PROFILE_DIR`) |
| `--image` | One image path (repeatable) |
| `--images-dir` | Directory of images (sorted by filename) |
| `--title` / `--body` / `--body-file` | Best-effort text fill |
| `--open-only` | Navigate only; no upload/fill |
| `--dry-run` | Print resolved options as JSON, exit |
| `--headless` | Headless mode (login is harder; default is headed) |

## Environment

| Variable | Purpose |
|----------|---------|
| `BAOYU_XHS_PROFILE_DIR` | Persistent browser profile path |
| `BAOYU_XHS_CHROME_CHANNEL` | e.g. `chrome` to use installed Chrome; `0` for bundled Chromium |

## Pitfalls

- Creator DOM changes often: auto-fill may fail; use `--open-only` and operate manually.
- **Do not** commit the profile directory to git; it may contain session data.
- Image upload uses the first visible `<input type="file">`; multi-step flows may require manual steps.

## Verification

- Browser opens the publish page without crashing.
- JSON line printed to stdout ends with `"ok": true` after navigation.
- You can complete login and see the compose UI.
