import type { SummarizerService } from "./types";

/** Stub — connect OpenAI / editorial model later */
export const summarizerService: SummarizerService = {
  async summarize(text, maxWords = 60) {
    const words = text.split(/\s+/).slice(0, maxWords).join(" ");
    return words || text.slice(0, 280);
  },
};
