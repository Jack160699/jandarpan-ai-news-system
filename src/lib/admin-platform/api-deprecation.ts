/** Standard deprecation headers for legacy /api/dashboard/* routes. */
export function legacyDashboardApiHeaders(successor: string): HeadersInit {
  return {
    Deprecation: "true",
    Link: `<${successor}>; rel="successor-version"`,
    "X-Platform-Console": "admin",
  };
}
