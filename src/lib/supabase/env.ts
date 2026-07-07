/**
 * Canonical Supabase environment — trim, validate, diagnostics
 *
 * Browser + server reads: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Server admin only: SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_HOST_RE = /^[a-z0-9-]+\.supabase\.co$/i;

let envCheckLogged = false;

function trimEnv(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/^\uFEFF/, "").trim().replace(/^['"]|['"]$/g, "");
}

export type SupabaseEnvDiagnostics = {
  hasUrl: boolean;
  hasAnon: boolean;
  hasServiceRole: boolean;
  urlHostname: string | null;
  urlValid: boolean;
  anonKeyPrefix: string | null;
  anonKeyLength: number;
  envNamesUsed: {
    url: "NEXT_PUBLIC_SUPABASE_URL";
    anon: "NEXT_PUBLIC_SUPABASE_ANON_KEY";
    serviceRole: "SUPABASE_SERVICE_ROLE_KEY";
  };
  warnings: string[];
};

function isNextBuildPhase(): boolean {
  const phase = process.env.NEXT_PHASE;
  return phase === "phase-production-build" || phase === "phase-export";
}

function logEnvCheckOnce(diag: SupabaseEnvDiagnostics): void {
  if (envCheckLogged) return;
  envCheckLogged = true;

  // Local/CI `next build` workers often run without .env.local — env is absent
  // by design here, not a production misconfiguration. Vercel injects
  // .env.production during build (verified in deployment logs).
  if (isNextBuildPhase() && !diag.hasUrl && !diag.hasAnon && !diag.hasServiceRole) {
    return;
  }

  console.log("[SUPABASE_ENV_CHECK]", {
    hasUrl: diag.hasUrl,
    hasAnon: diag.hasAnon,
    hasServiceRole: diag.hasServiceRole,
    urlHostname: diag.urlHostname,
    urlValid: diag.urlValid,
    anonKeyPrefix: diag.anonKeyPrefix,
    warnings: diag.warnings,
    phase: process.env.NEXT_PHASE ?? "runtime",
  });
}

export function getSupabaseEnvDiagnostics(): SupabaseEnvDiagnostics {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const url = trimEnv(rawUrl);
  const anon = trimEnv(rawAnon);
  const serviceRole = trimEnv(rawService);

  const warnings: string[] = [];
  let urlHostname: string | null = null;
  let urlValid = false;

  if (rawUrl && rawUrl !== url) {
    warnings.push("NEXT_PUBLIC_SUPABASE_URL had whitespace or quotes — trimmed");
  }
  if (rawAnon && rawAnon !== anon) {
    warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY had whitespace or quotes — trimmed");
  }

  if (url) {
    try {
      const parsed = new URL(url);
      urlHostname = parsed.hostname;
      urlValid =
        parsed.protocol === "https:" && SUPABASE_HOST_RE.test(parsed.hostname);
      if (!urlValid) {
        warnings.push(
          `URL hostname "${parsed.hostname}" should be https://<project-ref>.supabase.co`
        );
      }
    } catch {
      warnings.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
    }
  }

  if (anon && anon.length < 20) {
    warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY looks too short");
  }

  const diag: SupabaseEnvDiagnostics = {
    hasUrl: Boolean(url),
    hasAnon: Boolean(anon),
    hasServiceRole: Boolean(serviceRole),
    urlHostname,
    urlValid,
    anonKeyPrefix: anon ? anon.slice(0, 16) : null,
    anonKeyLength: anon.length,
    envNamesUsed: {
      url: "NEXT_PUBLIC_SUPABASE_URL",
      anon: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      serviceRole: "SUPABASE_SERVICE_ROLE_KEY",
    },
    warnings,
  };

  logEnvCheckOnce(diag);
  return diag;
}

export function isSupabaseConfigured(): boolean {
  const diag = getSupabaseEnvDiagnostics();
  return diag.hasUrl && diag.hasAnon && diag.urlValid;
}

export function getPublicSupabaseEnv(): { url: string; anonKey: string } {
  const diag = getSupabaseEnvDiagnostics();

  if (!diag.hasUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL — set it in Vercel Environment Variables and .env.local"
    );
  }
  if (!diag.hasAnon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — use the publishable/anon key from Supabase Dashboard → API Keys"
    );
  }
  if (!diag.urlValid) {
    throw new Error(
      `Invalid NEXT_PUBLIC_SUPABASE_URL hostname "${diag.urlHostname}" — copy Project URL from Supabase Settings → API`
    );
  }

  const url = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return { url, anonKey };
}

export function getServiceRoleEnv(): { url: string; serviceRoleKey: string } {
  const { url } = getPublicSupabaseEnv();
  const serviceRoleKey = trimEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — server-only; never expose to the browser"
    );
  }

  return { url, serviceRoleKey };
}
