/** Standard deprecation headers for superseded cron/worker API routes. */
export function legacyCronApiHeaders(successor: string): HeadersInit {
  return {
    Deprecation: "true",
    Link: `<${successor}>; rel="successor-version"`,
    "X-Superseded-By": successor,
  };
}
