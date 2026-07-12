import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AiAssistantExperience } from "@/features/ai-assistant/AiAssistantExperience";
import { isAiAssistantV3Enabled } from "@/lib/ai-assistant/config";
import { BRAND } from "@/lib/brand";
import { buildHubPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildHubPageMetadata({
  title: `AI Assistant · ${BRAND.nameEn}`,
  description:
    "Ask Jan Darpan AI for news summaries, timelines, and sourced answers from our newsroom.",
  path: "/ai-assistant",
});

/**
 * JDP-007 — Reader AI Assistant route.
 * Gated by NEXT_PUBLIC_AI_ASSISTANT_V3=1 (default OFF).
 */
export default function AiAssistantPage() {
  if (!isAiAssistantV3Enabled()) {
    notFound();
  }

  return (
    <main id="main-content" className="ai-v3-page">
      <AiAssistantExperience />
    </main>
  );
}
