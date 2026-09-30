// Supabase Edge Function: editorial-worker (one editorial candidate per invocation).
//
// This file is intentionally tiny. The implementation is bundled from src/edge/editorial-worker/serve.ts by
//   pnpm edge:build
// into ./worker.bundle.js (git-ignored, ~0.5 MB). Deploy only after building:
//   pnpm edge:build && supabase functions deploy editorial-worker --no-verify-jwt
// See docs/EDGE_EDITORIAL_WORKER_DESIGN.md. Nothing is deployed by committing this file.
import "./worker.bundle.js";
