import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_MODEL = "cogview-3-flash";

type ZaiResponse = {
  data?: Array<{ url?: string }>;
};

function getApiKey(): string | null {
  return process.env.ZAI_API_KEY || process.env.BIGMODEL_API_KEY || null;
}

function buildZaiUrl(): string {
  const base = (process.env.ZAI_BASE_URL || process.env.BIGMODEL_BASE_URL || "https://api.z.ai/api/paas/v4")
    .replace(/\/+$/g, "");
  if (base.endsWith("/images/generations")) return base;
  if (base.endsWith("/api/paas/v4")) return `${base}/images/generations`;
  if (base.endsWith("/v4")) return `${base}/images/generations`;
  return `${base}/api/paas/v4/images/generations`;
}

function legacySizeForWeChat(): string {
  return "1024x1024";
}

export function parseGenImageSource(src: string): { model: string; prompt: string } | null {
  const trimmed = src.trim();
  if (trimmed.startsWith("gen://")) {
    const rest = trimmed.slice("gen://".length);
    const slash = rest.indexOf("/");
    if (slash < 1) return null;
    const model = rest.slice(0, slash).trim();
    const rawPrompt = rest.slice(slash + 1);
    let prompt = rawPrompt.trim();
    try {
      prompt = decodeURIComponent(prompt);
    } catch {
      /* keep raw */
    }
    if (!model || !prompt) return null;
    return { model, prompt };
  }
  if (trimmed.startsWith("gen:")) {
    const prompt = trimmed.slice(4).trim();
    if (!prompt) return null;
    const model = process.env.BAOYU_GEN_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
    return { model, prompt };
  }
  return null;
}

export function isGenImageSource(src: string): boolean {
  return parseGenImageSource(src) !== null;
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`Failed to download generated image: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

export async function materializeGenImageToFile(
  src: string,
  tempDir: string,
  logLabel: string,
): Promise<string> {
  const parsed = parseGenImageSource(src);
  if (!parsed) {
    throw new Error(`Invalid gen image source: ${src}`);
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      "ZAI_API_KEY or BIGMODEL_API_KEY is required for gen: / gen:// image placeholders. Get a key from https://docs.z.ai/",
    );
  }

  const { model, prompt } = parsed;
  const hash = createHash("md5").update(`${model}:${prompt}`).digest("hex").slice(0, 12);
  const outPath = path.join(tempDir, `gen_${hash}.png`);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    console.error(`[${logLabel}] Reusing generated image: ${path.basename(outPath)}`);
    return outPath;
  }

  if (process.env.BAOYU_MD_DISABLE_GEN === "1") {
    throw new Error("BAOYU_MD_DISABLE_GEN=1 blocks gen: image generation.");
  }

  console.error(`[${logLabel}] GLM image gen (${model}): ${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}`);

  const body = {
    model,
    prompt,
    quality: "standard" as const,
    size: legacySizeForWeChat(),
  };

  const response = await fetch(buildZaiUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Z.AI image API error (${response.status}): ${err}`);
  }

  const result = (await response.json()) as ZaiResponse;
  const url = result.data?.[0]?.url;
  if (!url) {
    throw new Error("No image URL in Z.AI response");
  }

  await downloadToFile(url, outPath);
  return outPath;
}
