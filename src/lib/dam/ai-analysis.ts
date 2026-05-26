/**
 * AI tagging, OCR, object detection, captions, facial grouping (vision API)
 */

import type { DamFaceGroup, DamMediaType } from "@/lib/dam/types";

export type DamAiAnalysis = {
  tags: string[];
  objects: string[];
  ocr: string | null;
  caption: string | null;
  faces: DamFaceGroup[];
};

export async function analyzeAssetWithAi(input: {
  mediaType: DamMediaType;
  mimeType: string;
  name: string;
  imageUrl?: string;
  imageBase64?: string;
}): Promise<DamAiAnalysis> {
  const fallback = heuristicAnalysis(input.name, input.mediaType);

  if (input.mediaType !== "image" || !input.imageBase64) {
    return fallback;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallback;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 500,
        messages: [
          {
            role: "system",
            content: `You are a newsroom DAM assistant. Return ONLY valid JSON:
{"tags":[],"objects":[],"ocr":"","caption":"","faceGroups":[{"groupId":"g1","label":"description","count":1}]}
Tags: lowercase, news-relevant. OCR: visible text in image. Caption: one neutral sentence.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this news asset: ${input.name}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${input.mimeType};base64,${input.imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return fallback;

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(extractJson(raw)) as {
      tags?: string[];
      objects?: string[];
      ocr?: string;
      caption?: string;
      faceGroups?: DamFaceGroup[];
    };

    return {
      tags: (parsed.tags ?? []).slice(0, 20),
      objects: (parsed.objects ?? []).slice(0, 15),
      ocr: parsed.ocr?.trim() || null,
      caption: parsed.caption?.trim() || null,
      faces: (parsed.faceGroups ?? []).slice(0, 8),
    };
  } catch {
    return fallback;
  }
}

function heuristicAnalysis(name: string, mediaType: DamMediaType): DamAiAnalysis {
  const base = name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]/g, " ")
    .toLowerCase();
  const tags = base.split(/\s+/).filter((w) => w.length > 3).slice(0, 6);

  return {
    tags: tags.length ? tags : [mediaType, "newsroom"],
    objects: mediaType === "image" ? ["scene"] : [],
    ocr: null,
    caption:
      mediaType === "video"
        ? "Video asset — enable transcript worker for auto captions."
        : mediaType === "audio"
          ? "Audio asset — attach transcript for searchability."
          : `Newsroom ${mediaType}: ${base}`,
    faces: [],
  };
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}
