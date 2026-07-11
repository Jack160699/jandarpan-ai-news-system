export type NotificationCategory = "breaking" | "government" | "general" | "live";

export type NotificationPriority = "urgent" | "high" | "normal";

export type NotificationFilter =
  | "all"
  | "breaking"
  | "government"
  | "saved"
  | "unread";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: string;
  href?: string;
  source?: string;
  district?: string;
  read: boolean;
  saved: boolean;
};

export type NotificationSettings = {
  breakingAlerts: boolean;
  governmentAlerts: boolean;
  liveDeskUpdates: boolean;
  districtDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  soundEnabled: boolean;
};
