# CG Bhaskar — Concept Redesign

**Speculative premium redesign** for presentation and pitching purposes only.  
Not affiliated with CG Bhaskar. Not an official product.

## Experience

- Cinematic editorial newspaper (Next.js App Router)
- Lenis smooth scroll + GSAP ScrollTrigger
- Mobile-first reading ritual
- Living archive, investigations threads, longform immersion
- Editorial intelligence (reading memory, adaptive pacing)

## Stack

- Next.js 16 · TypeScript · Tailwind CSS v4
- Framer Motion · GSAP · Lenis

## Develop

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (Vercel)

```bash
npm run build
```

Deploy the `newspaper-motion` directory as the project root. No extra env vars required.

**Note:** Use only `src/app/` for routes. Do not add a root-level `app/` folder — an empty root `app/` will shadow `src/app/` and break the build.

Recommended Vercel settings:

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output: default

## Structure

```
src/
  app/              # Routes (home, archive, story/[slug])
  components/       # cinema, editorial, institution, motion
  lib/              # articles, brand, archive, institution
  sections/         # Page sections
  styles/           # globals, brand-cgb, institution
```

## Concept notes

- Sample headlines and Hindi/English editorial copy are **reimagined placeholders**
- Images via Unsplash (remote patterns in `next.config.ts`)
- `robots: noindex` on concept build — remove in production pitch fork if indexing is desired
