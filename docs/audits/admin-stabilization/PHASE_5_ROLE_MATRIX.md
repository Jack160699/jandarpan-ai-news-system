# Phase 5 Role Matrix

| Persona | DB role | Landing | Denied (direct URL) | Notes |
|---|---|---|---|---|
| Super admin | `super_admin` | `/admin/overview` | — | Full workspaces |
| Technical admin / EIC | `moderator` | `/admin/editorial` | `/admin/team`, `/admin/executive` | Platform OK; billing API 403 |
| Business admin | *n/a* | — | — | No distinct DB role; billing = super_admin only |
| Editor | `editor` | `/admin/stories` | team, technical, executive | |
| Reporter | `journalist` | `/admin/editorial` | team, executive | |
| Viewer | `journalist` (alias) | `/admin/editorial` | `/admin/team` | |

Spec: `e2e/phase5-role-matrix.spec.ts` — **passed**.
