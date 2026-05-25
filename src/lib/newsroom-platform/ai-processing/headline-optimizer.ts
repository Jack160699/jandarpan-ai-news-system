import type { HeadlineOptimizerService } from "./types";

export const headlineOptimizerService: HeadlineOptimizerService = {
  async optimize(headline) {
    return headline.trim();
  },
};
