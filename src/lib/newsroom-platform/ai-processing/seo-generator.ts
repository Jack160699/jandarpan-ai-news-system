import type { SeoMetadataService } from "./types";

export const seoMetadataService: SeoMetadataService = {
  async generate({ title, excerpt, tags }) {
    return {
      title: `${title} | Jan Darpan Chhattisgarh`,
      description: excerpt.slice(0, 155),
      keywords: tags.slice(0, 8),
    };
  },
};
