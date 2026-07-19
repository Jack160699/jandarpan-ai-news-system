# Phase 4 Route Map

**Date:** 2026-07-19  
**Source of truth:** `src/lib/admin-platform/workspaces.ts`

## Primary workspaces (sidebar)

| Workspace | Home | Primary nav | More tools |
|---|---|---|---|
| Command Centre | `/admin/overview` | Command centre | — |
| Editorial | `/admin/editorial` | Editorial Home, Story Queue, All Stories, Editor, Breaking & Live | Sources, Districts, Categories, Images & Media, Media Library, Workflow, Collaboration, Intelligence, AI Copilot |
| Business | `/admin/business` | Business Overview, Audience, SEO Hub, Costs | Rankings, Competitors, SEO Intelligence, SEO Execution, Autonomous SEO, Revenue / Billing |
| Platform | `/admin/technical` | Platform Overview, Health, Pipeline, Ingestion, Database | (discover via command search / pipeline page) |

## Account menu only

| Item | Route | Gate |
|---|---|---|
| Team | `/admin/team` | `super_admin` |
| Settings | `/admin/settings` (+ Organization) | `editorial:write` |
| Sign out | logout API | authenticated |

Not repeated in sidebar workspace lists.

## Editor

| Route | Shell |
|---|---|
| `/admin/editor` | AdminShell (index) |
| `/admin/editor/[id]` | AdminShell + workbench (`hidePageHeader`) |

Active workspace: **Editorial**.

## Command search

Includes all permitted workspace routes, common actions (stories, sources, districts, settings, team, costs, SEO), and story text search footer.
