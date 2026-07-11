import type { NotificationFilter } from "./types";

export const NOTIFICATION_FILTERS: {
  id: NotificationFilter;
  label: string;
  labelHi: string;
}[] = [
  { id: "all", label: "All", labelHi: "सभी" },
  { id: "breaking", label: "Breaking", labelHi: "ब्रेकिंग" },
  { id: "government", label: "Government", labelHi: "सरकारी" },
  { id: "saved", label: "Saved", labelHi: "सहेजे गए" },
  { id: "unread", label: "Unread", labelHi: "अपठित" },
];

export const DEFAULT_NOTIFICATION_SETTINGS = {
  breakingAlerts: true,
  governmentAlerts: true,
  liveDeskUpdates: true,
  districtDigest: false,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  soundEnabled: true,
} as const;
