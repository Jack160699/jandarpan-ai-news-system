/**
 * Centralized TanStack Query keys — admin runtime namespace.
 */

export const queryKeys = {
  admin: {
    session: ["admin", "session"] as const,
  },
  editorial: {
    dashboard: ["editorial", "dashboard"] as const,
    article: (id: string) => ["editorial", "article", id] as const,
    workflow: ["editorial", "workflow"] as const,
  },
  team: {
    roster: ["admin", "team", "roster"] as const,
  },
  analytics: {
    enterprise: ["admin", "analytics", "enterprise"] as const,
    intelligence: ["admin", "analytics", "intelligence"] as const,
  },
  collaboration: {
    room: (articleId: string) => ["collaboration", "room", articleId] as const,
    comments: (articleId: string) => ["collaboration", "comments", articleId] as const,
  },
} as const;
