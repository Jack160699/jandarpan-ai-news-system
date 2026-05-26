/** Session & auth security constants */

export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
export const REFRESH_MAX_AGE_SEC = 60 * 60 * 24 * 30;
export const INACTIVITY_TIMEOUT_SEC = 60 * 60 * 4; // 4 hours desk inactivity
export const LAST_ACTIVITY_COOKIE = "nr-last-activity";
export const ROLE_COOKIE = "nr-dashboard-role";
export const TENANT_COOKIE_AUTH = "nr-dashboard-tenant";

export const LOGIN_RATE_LIMIT = { maxAttempts: 8, windowSec: 900 }; // 8 / 15 min
export const API_RATE_LIMIT = { maxAttempts: 120, windowSec: 60 };
export const SUPER_ADMIN_ACTION_LIMIT = { maxAttempts: 30, windowSec: 60 };

export const ACCOUNT_LOCKOUT_THRESHOLD = 12;
export const ACCOUNT_LOCKOUT_WINDOW_SEC = 3600;

export const SUSPICIOUS_LOGIN_WINDOW_SEC = 86400;
export const SUSPICIOUS_IP_THRESHOLD = 5;
