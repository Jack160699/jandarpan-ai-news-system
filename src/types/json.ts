import type { Json } from "@/types/supabase";

export type JsonObject = {
  [key: string]: Json;
};

export type JsonArray = Json[];

export function asJson<T>(value: T): Json {
  return value as Json;
}

export function asJsonObject(
  value: Record<string, unknown>
): JsonObject {
  return value as JsonObject;
}

/** Normalize a Supabase Json column to a string-keyed object for reads. */
export function jsonObjectFrom(value: Json | null | undefined): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}
