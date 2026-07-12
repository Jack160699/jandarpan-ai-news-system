"use client";

import { useMemo } from "react";
import type { DistrictV3Data } from "../types";
import { getDistrictV3Placeholder } from "../data/placeholders";

export type UseDistrictV3DataOptions = {
  slug: string;
  name: string;
  data?: Partial<DistrictV3Data>;
};

export function useDistrictV3Data({ slug, name, data }: UseDistrictV3DataOptions) {
  return useMemo(
    () => ({
      ...getDistrictV3Placeholder(slug, name),
      ...data,
    }),
    [slug, name, data]
  );
}
