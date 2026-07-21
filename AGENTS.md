<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Jan Darpan quality gates

- **SEO & discoverability** are mandatory for every page/feature before COMPLETE. See `docs/jandarpan-seo-quality-gate.md` and `.cursor/rules/seo-quality-gate.mdc`.
- Prefer existing helpers in `src/lib/seo/` (metadata, JSON-LD, sitemap). Hindi-first; no duplicate titles/descriptions; no thin programmatic pages.
