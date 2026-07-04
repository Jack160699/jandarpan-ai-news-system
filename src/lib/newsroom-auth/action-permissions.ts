import type { DashboardPermission } from "@/lib/saas-auth/types";

const ACTION_PERMISSIONS: Record<string, DashboardPermission> = {
  approve: "publish:write",
  reject: "editorial:write",
  update_headline: "editorial:write",
  regenerate_article: "editorial:write",
  regenerate_image: "editorial:write",
  manual_publish: "publish:write",
  pin: "publish:write",
  unpin: "publish:write",
  feature: "publish:write",
  unfeature: "publish:write",
  mark_breaking: "publish:write",
  unmark_breaking: "publish:write",
  disable_rss: "providers:read",
  enable_rss: "providers:read",
  enrich_intelligence: "editorial:write",
};

export function permissionForEditorialAction(
  action: string
): DashboardPermission {
  return ACTION_PERMISSIONS[action] ?? "editorial:write";
}
