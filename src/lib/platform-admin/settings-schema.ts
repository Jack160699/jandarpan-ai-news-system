import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  Bot,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Database,
  FileText,
  GitBranch,
  Globe2,
  HardDrive,
  AtSign,
  KeyRound,
  Layers,
  Lock,
  MapPin,
  Megaphone,
  PenLine,
  Radio,
  Rss,
  Send,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tags,
  UserCog,
  Video,
  Zap,
} from "lucide-react";
import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";

export type SettingsCardDef = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  defaultEnabled: boolean;
  statusLabel?: (enabled: boolean) => string;
};

export type SettingsSectionDef = {
  id: string;
  title: string;
  subtitle: string;
  cards: SettingsCardDef[];
};

/** Homepage module keys map to platform_config homepage_sections */
export const HOMEPAGE_SECTION_META: Record<
  PlatformSectionConfig["key"],
  Pick<SettingsCardDef, "title" | "description" | "icon">
> = {
  breaking: {
    title: "Breaking Ticker",
    description: "Live marquee for urgent headlines across the homepage hero.",
    icon: Megaphone,
  },
  district_wire: {
    title: "District Wire",
    description: "Regional desk feed with district-level prioritization.",
    icon: MapPin,
  },
  global_brief: {
    title: "Global Brief",
    description: "International and national digest for executive readers.",
    icon: Globe2,
  },
  explore_topics: {
    title: "Explore Topics",
    description: "AI-curated topic discovery rail for editorial exploration.",
    icon: Sparkles,
  },
  topic_hubs: {
    title: "Topic Hubs",
    description: "SEO topic landing modules linked to the content graph.",
    icon: Layers,
  },
};

export const PLATFORM_SETTINGS_SECTIONS: SettingsSectionDef[] = [
  {
    id: "ai_systems",
    title: "AI Systems",
    subtitle: "Intelligent pipelines powering headline, taxonomy, and verification.",
    cards: [
      {
        id: "ai_headline_generator",
        title: "AI Headline Generator",
        description: "Neural headline variants tuned for CTR and regional tone.",
        icon: PenLine,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Agents active" : "Standby"),
      },
      {
        id: "auto_categorization",
        title: "Auto Categorization",
        description: "Classifies stories into desks, districts, and content types.",
        icon: Tags,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Learning" : "Manual only"),
      },
      {
        id: "ai_rewrite_engine",
        title: "AI Rewrite Engine",
        description: "Editorial-safe paraphrase with style and length controls.",
        icon: Bot,
        defaultEnabled: false,
        statusLabel: (on) => (on ? "Queue ready" : "Disabled"),
      },
      {
        id: "fact_verification_layer",
        title: "Fact Verification Layer",
        description: "Cross-source corroboration before publish eligibility.",
        icon: ShieldCheck,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Shield on" : "Bypass risk"),
      },
    ],
  },
  {
    id: "publishing_pipeline",
    title: "Publishing Pipeline",
    subtitle: "Govern how stories move from desk to distribution.",
    cards: [
      {
        id: "auto_publish",
        title: "Auto Publish",
        description: "Publish high-confidence AI stories without manual gate.",
        icon: Zap,
        defaultEnabled: false,
        statusLabel: (on) => (on ? "Live path" : "Review required"),
      },
      {
        id: "human_approval_queue",
        title: "Human Approval Queue",
        description: "Route sensitive stories through editor sign-off.",
        icon: CheckCircle2,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Desk gated" : "Open publish"),
      },
      {
        id: "scheduled_publishing",
        title: "Scheduled Publishing",
        description: "Time-box releases for peak readership windows.",
        icon: CalendarClock,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Scheduler on" : "Immediate only"),
      },
      {
        id: "push_notifications",
        title: "Push Notifications",
        description: "Breaking alerts to mobile and PWA subscribers.",
        icon: BellRing,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Broadcast ready" : "Silent"),
      },
    ],
  },
  {
    id: "social_distribution",
    title: "Social Distribution",
    subtitle: "Omnichannel syndication from a single newsroom control plane.",
    cards: [
      {
        id: "youtube_automation",
        title: "YouTube Automation",
        description: "Shorts and bulletin packaging for video desks.",
        icon: Video,
        defaultEnabled: false,
        statusLabel: (on) => (on ? "Channel linked" : "Not connected"),
      },
      {
        id: "instagram_reels",
        title: "Instagram Reels",
        description: "Vertical cuts with branded overlays and captions.",
        icon: Smartphone,
        defaultEnabled: false,
        statusLabel: (on) => (on ? "Reels sync" : "Paused"),
      },
      {
        id: "whatsapp_broadcast",
        title: "WhatsApp Broadcast",
        description: "Regional subscriber lists with digest templates.",
        icon: Send,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Lists armed" : "Offline"),
      },
      {
        id: "x_twitter_posting",
        title: "X / Twitter Posting",
        description: "Thread composer with link cards and breaking tags.",
        icon: AtSign,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Posting" : "Draft only"),
      },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    subtitle: "Core platform health, observability, and capacity signals.",
    cards: [
      {
        id: "supabase_monitoring",
        title: "Supabase Status",
        description: "Database, auth, and realtime channel observability.",
        icon: Database,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Monitored" : "Alerts off"),
      },
      {
        id: "queue_health_alerts",
        title: "Queue Health",
        description: "AI and image worker backlog degradation alerts.",
        icon: Rss,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Watchdog on" : "Muted"),
      },
      {
        id: "cdn_performance",
        title: "CDN Performance",
        description: "Edge cache hit ratio and origin latency tracking.",
        icon: Cloud,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Edge tuned" : "Local only"),
      },
      {
        id: "storage_usage",
        title: "Storage Usage",
        description: "Media DAM capacity and lifecycle retention policies.",
        icon: HardDrive,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Quota tracked" : "Unbounded"),
      },
    ],
  },
  {
    id: "security_permissions",
    title: "Security & Permissions",
    subtitle: "Access control, audit trails, and editorial safeguards.",
    cards: [
      {
        id: "rbac_enforcement",
        title: "RBAC Enforcement",
        description: "Role-based gates on publish, billing, and schema tools.",
        icon: Shield,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Enforced" : "Permissive"),
      },
      {
        id: "two_factor_required",
        title: "2FA for Editors",
        description: "Require two-factor authentication for desk accounts.",
        icon: KeyRound,
        defaultEnabled: false,
        statusLabel: (on) => (on ? "Required" : "Optional"),
      },
      {
        id: "audit_log_retention",
        title: "Audit Log Retention",
        description: "Immutable security and editorial event archival.",
        icon: Lock,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "90d retained" : "Ephemeral"),
      },
      {
        id: "super_admin_alerts",
        title: "Super Admin Alerts",
        description: "Notify platform owners on privilege escalations.",
        icon: UserCog,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Watching" : "Muted"),
      },
    ],
  },
  {
    id: "editorial_workflow",
    title: "Editorial Workflow",
    subtitle: "Desk routing, collaboration, and story lifecycle controls.",
    cards: [
      {
        id: "workflow_automation",
        title: "Workflow Automation",
        description: "Auto-assign stories by district and content type.",
        icon: GitBranch,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Routing live" : "Manual assign"),
      },
      {
        id: "collaboration_rooms",
        title: "Collaboration Rooms",
        description: "Realtime co-editing and presence in the editor.",
        icon: Radio,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Rooms open" : "Solo mode"),
      },
      {
        id: "draft_recovery",
        title: "Draft Recovery",
        description: "Autosave snapshots and crash-safe draft restore.",
        icon: FileText,
        defaultEnabled: true,
        statusLabel: (on) => (on ? "Protected" : "Off"),
      },
      {
        id: "editorial_sla",
        title: "Editorial SLA Tracking",
        description: "SLA timers for review, publish, and breaking desks.",
        icon: CalendarClock,
        defaultEnabled: false,
        statusLabel: (on) => (on ? "SLA active" : "No timers"),
      },
    ],
  },
];

export const HOMEPAGE_DISPLAY_KEYS: PlatformSectionConfig["key"][] = [
  "breaking",
  "district_wire",
  "global_brief",
  "explore_topics",
];

export function defaultNewsroomSettings(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const section of PLATFORM_SETTINGS_SECTIONS) {
    for (const card of section.cards) {
      out[card.id] = card.defaultEnabled;
    }
  }
  return out;
}

export function mergeNewsroomSettings(
  raw: Record<string, unknown> | undefined
): Record<string, boolean> {
  const base = defaultNewsroomSettings();
  if (!raw) return base;
  for (const key of Object.keys(base)) {
    const v = raw[key];
    if (typeof v === "boolean") base[key] = v;
  }
  return base;
}
