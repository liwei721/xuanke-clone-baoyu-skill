# Xiaohongshu (小红书) — compliance and safe use

This skill **opens the official creator publish page** in a real browser (Playwright) and may **best-effort** fill title, description, or image uploads. It does **not** implement headless “one-click publish”, scheduled posting, or bulk automation.

## Principles

1. **Human in the loop** — You log in (QR / SMS as required by the platform) and **you** click publish. The script exits only when you stop the process (e.g. Ctrl+C); keep the window open until you are done.
2. **No evasion** — Do not use this to bypass captchas, rate limits, or account verification.
3. **Respect platform rules** — Follow [小红书社区规范](https://www.xiaohongshu.com/) and official announcements (e.g. governance notices on AI-assisted or automated accounts). When in doubt, publish manually without automation.
4. **Low frequency** — Avoid rapid-fire posts; space out activity to reduce risk of being flagged.
5. **Selectors break** — The creator UI changes often. If auto-fill fails, use `--open-only` and complete everything by hand.

## Compared with cookie/API-only tools

Some third-party projects publish via cookies or private APIs. This skill **does not** ship cookie-based posting; it reduces scope to **browser assistance** so expectations stay clear and you stay responsible for final publication.

## References

- Inspiration for image-first workflows: [Auto-Redbook-Skills](https://github.com/comeonzhj/Auto-Redbook-Skills) (external; not bundled — use this skill’s Playwright flow instead).
