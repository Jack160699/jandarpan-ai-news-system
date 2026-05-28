# Jandarpan – AI Automated News System

## Overview
Jandarpan is an AI-powered automated newsroom system designed to generate, process, and publish news content with minimal manual intervention.

The platform focuses on transforming traditional content operations into scalable, automated workflows.

## Key Features
- AI-powered content generation  
- Automated publishing (real-time & scheduled)  
- CMS dashboard for editorial control  
- Workflow automation for ingestion and publishing  
- Source reliability tracking and system monitoring  

## Business Impact
- Reduced manual content publishing effort  
- Enabled continuous news generation and delivery  
- Improved operational efficiency through automation  

## Environment Variables
| Variable | Purpose |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only access |
| `GNEWS_API_KEY` | News data source (India headlines) |
| `NEWSDATA_API_KEY` | Global + Hindi news data |
| `CRON_SECRET` | Secure cron job access |
| `NEWSROOM_DEFAULT_TENANT` | Default tenant config |
| `OPENAI_API_KEY` | AI summaries / headlines |

## Stack
- Next.js (TypeScript)
- Supabase (Database)
- RSS Feeds
- APIs (GNews, NewsData)
- Vercel (Deployment)

## Automated News Pipeline

### Architecture
- External APIs → Data ingestion  
- Backend processing → AI + filtering  
- Supabase → Storage  
- Frontend → Display  

## Develop

```bash
npm install
npm run dev
