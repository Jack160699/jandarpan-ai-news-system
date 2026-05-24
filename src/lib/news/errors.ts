/**
 * Typed news fetch failures — rate limits, timeouts, config gaps.
 */

export type NewsFetchErrorCode =
  | "RATE_LIMIT"
  | "QUOTA_EXCEEDED"
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "NOT_CONFIGURED"
  | "EMPTY_RESPONSE"
  | "NETWORK"
  | "UNKNOWN";

export class NewsFetchError extends Error {
  readonly code: NewsFetchErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly provider?: string;

  constructor(
    message: string,
    options: {
      code?: NewsFetchErrorCode;
      status?: number;
      retryable?: boolean;
      provider?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "NewsFetchError";
    this.code = options.code ?? "UNKNOWN";
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.provider = options.provider;
  }
}

const RATE_LIMIT_RE =
  /rate\s*limit|too\s*many\s*requests|quota|usage\s*limit|plan\s*limit|429/i;

export function classifyHttpFailure(
  status: number,
  bodySnippet: string,
  provider?: string
): NewsFetchError {
  const snippet = bodySnippet.slice(0, 400);

  if (status === 429 || RATE_LIMIT_RE.test(snippet)) {
    return new NewsFetchError(
      provider
        ? `${provider}: rate limit or quota exceeded`
        : "Rate limit or quota exceeded",
      {
        code: status === 429 ? "RATE_LIMIT" : "QUOTA_EXCEEDED",
        status,
        retryable: true,
        provider,
      }
    );
  }

  if (status === 401 || status === 403) {
    return new NewsFetchError(
      provider
        ? `${provider}: unauthorized (${status})`
        : `Unauthorized (${status})`,
      {
        code: "HTTP_ERROR",
        status,
        retryable: false,
        provider,
      }
    );
  }

  return new NewsFetchError(
    provider
      ? `${provider}: HTTP ${status} — ${snippet}`
      : `HTTP ${status}: ${snippet}`,
    {
      code: "HTTP_ERROR",
      status,
      retryable: status >= 500,
      provider,
    }
  );
}

export function isRateLimitError(err: unknown): boolean {
  if (err instanceof NewsFetchError) {
    return err.code === "RATE_LIMIT" || err.code === "QUOTA_EXCEEDED";
  }
  if (err instanceof Error) {
    return RATE_LIMIT_RE.test(err.message);
  }
  return false;
}
