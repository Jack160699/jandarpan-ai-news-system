import type { DuplicateDetectorService } from "./types";

export const duplicateDetectorService: DuplicateDetectorService = {
  async check(_text, _corpusIds) {
    return { duplicate: false, score: 0 };
  },
};
