# Digital Asset Management (DAM)

## Route

**`/admin/media`** — requires `editorial:write`

Legacy editorial image queue remains at `/admin/images`.

## Features

| Feature | Implementation |
|---------|----------------|
| Image / video / audio libraries | `dam_assets.media_type` + UI filters |
| Drag-drop upload | Dropzone + `POST /api/dam/upload` |
| AI tagging | OpenAI vision (`ai-analysis.ts`) |
| Metadata extraction | Sharp EXIF/format + AI JSON |
| Copyright tracking | `copyright` jsonb on asset |
| Duplicate detection | SHA-256 `content_hash` per tenant |
| CDN optimization | `optimizeCdnUrl` + Supabase transform params |
| Folder organization | `dam_folders` + sidebar |
| Advanced search | `ilike` on name, caption, OCR |
| Auto captions | Vision model `caption` field |
| Object detection | `ai_objects[]` |
| OCR | `ai_ocr` text |
| Facial grouping | `ai_faces` JSON groups |
| Smart recommendations | `recommendations.ts` heuristics |
| Compression | Sharp → WebP quality 82 |
| Responsive variants | thumb, sm, md, lg in `dam_asset_variants` |
| Watermarking | SVG composite via Sharp (`NEWSROOM_DAM_WATERMARK`) |

## API

- `GET /api/dam/library` — list assets, folders, recommendations
- `POST /api/dam/upload` — multipart file upload
- `GET/PATCH/DELETE /api/dam/assets/[id]`
- `POST /api/dam/assets/[id]/analyze` — re-run AI
- `POST /api/dam/folders` — create folder

## Storage architecture

```
Supabase Storage (bucket: NEWSROOM_DAM_BUCKET || NEWSROOM_STORAGE_BUCKET || editorial-images)
└── dam/
    └── {tenant_id}/
        └── {asset_id}/
            ├── original.webp          (master image)
            ├── thumb.webp             (variants)
            ├── sm.webp
            ├── md.webp
            └── lg.webp
            └── {filename}             (video/audio original)
```

**Database**

- `dam_folders` — hierarchical folders per tenant
- `dam_assets` — canonical record (URL, hash, AI fields, copyright)
- `dam_asset_variants` — responsive renditions linked to asset

**Flow**

1. Upload receives `File` → buffer
2. Hash computed → duplicate lookup
3. Images: Sharp pipeline (compress, variants, optional watermark)
4. Storage upload via service role
5. AI analysis (optional, OpenAI vision for images)
6. Insert rows + return asset JSON

**Isolation**

- All rows scoped by `tenant_id`
- RLS: service role only (admin API uses service client)

## CDN strategy

1. **Origin** — Supabase public bucket URLs (`getPublicUrl`)
2. **Transform** — `optimizeCdnUrl()` appends `width`, `quality`, `resize=cover` for `*.supabase.co/storage/*` paths
3. **Variants** — Pre-generated WebP sizes reduce origin work; CDN/browser cache via `cacheControl: 31536000`
4. **Next/Image** — `next.config.ts` already allows Supabase storage hostnames
5. **Future** — Point `CDN_BASE_URL` env to Cloudflare/Fastly in front of bucket; swap `public_url` at insert time

**Recommended production setup**

- Public bucket `editorial-images` (or dedicated `newsroom-dam`)
- Cloudflare cache rules on `/storage/v1/object/public/*`
- WebP variants served for cards; `lg` for hero; original for download rights

## Setup

1. Run migration `030_dam_media.sql`
2. Ensure storage bucket exists (public read)
3. Optional: `OPENAI_API_KEY` for vision tagging
4. Optional: `NEWSROOM_DAM_WATERMARK="Jan Darpan"`
