import type { TranslatorService } from "./types";

export const translatorService: TranslatorService = {
  async translate(text, _targetLang) {
    return text;
  },
};
