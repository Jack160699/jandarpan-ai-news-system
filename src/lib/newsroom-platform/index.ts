/**
 * Jan Darpan modular newsroom platform — public API surface.
 * Mock-driven today; Supabase + AI services plug in via feeds/db/ai-processing.
 */

export * from "./content/types";
export * from "./content/adapters";
export * from "./config/districts";
export * from "./config/topics";
export * from "./config/sections";
export * from "./config/isr";
export * from "./feeds";
export * from "./ai-processing";
