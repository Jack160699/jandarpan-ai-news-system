import { createPublicKey, createVerify, generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleAuthError,
  getGoogleAccessToken,
  googleProjectId,
  googleTtsConfigured,
  parseServiceAccount,
  resetGoogleTokenCache,
  signServiceAccountJwt,
} from "@/lib/voice/google-auth";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const sa = { client_email: "tts@jd-test.iam.gserviceaccount.com", private_key: privateKey, project_id: "jd-test" };
const env = { GOOGLE_TTS_SERVICE_ACCOUNT_JSON: JSON.stringify(sa) };

beforeEach(() => resetGoogleTokenCache());

describe("google-auth", () => {
  it("parses raw and base64 service-account JSON and rejects junk", () => {
    expect(parseServiceAccount(JSON.stringify(sa))?.client_email).toBe(sa.client_email);
    expect(parseServiceAccount(Buffer.from(JSON.stringify(sa)).toString("base64"))?.client_email).toBe(sa.client_email);
    expect(parseServiceAccount("not json")).toBeNull();
    expect(parseServiceAccount(JSON.stringify({ client_email: "x" }))).toBeNull();
    expect(parseServiceAccount(undefined)).toBeNull();
  });

  it("normalises escaped newlines in the private key (common when pasted into env vars)", () => {
    const escaped = JSON.stringify({ ...sa, private_key: privateKey.replace(/\n/g, "\\n") }).replace(/\\\\n/g, "\\n");
    expect(parseServiceAccount(escaped)?.private_key).toContain("\n");
  });

  it("reports configuration and project without exposing secrets", () => {
    expect(googleTtsConfigured(env)).toBe(true);
    expect(googleTtsConfigured({})).toBe(false);
    expect(googleProjectId(env)).toBe("jd-test");
    expect(googleProjectId({ ...env, GOOGLE_CLOUD_PROJECT: "billing-proj" })).toBe("billing-proj");
  });

  it("signs a valid RS256 JWT that verifies with the public key", () => {
    const jwt = signServiceAccountJwt(sa, 1_800_000_000);
    const [h, c, s] = jwt.split(".");
    expect(JSON.parse(Buffer.from(h!, "base64url").toString())).toEqual({ alg: "RS256", typ: "JWT" });
    const claims = JSON.parse(Buffer.from(c!, "base64url").toString());
    expect(claims).toMatchObject({ iss: sa.client_email, aud: "https://oauth2.googleapis.com/token", iat: 1_800_000_000, exp: 1_800_003_600 });
    const v = createVerify("RSA-SHA256");
    v.update(`${h}.${c}`);
    expect(v.verify(createPublicKey(publicKey), Buffer.from(s!, "base64url"))).toBe(true);
  });

  it("exchanges the JWT for a token and caches it until near expiry", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify({ access_token: "tok-1", expires_in: 3600 }), { status: 200 }));
    let now = 1_000_000;
    const a = await getGoogleAccessToken(env, fetchMock as never, () => now);
    now += 10 * 60_000;
    const b = await getGoogleAccessToken(env, fetchMock as never, () => now);
    expect(a).toBe("tok-1");
    expect(b).toBe("tok-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now += 60 * 60_000;
    await getGoogleAccessToken(env, fetchMock as never, () => now);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body = String((fetchMock.mock.calls[0]![1] as RequestInit).body);
    expect(body).toContain("grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");
  });

  it("classifies failures without leaking response bodies", async () => {
    await expect(getGoogleAccessToken({}, vi.fn() as never)).rejects.toMatchObject({ kind: "not_configured" });
    const denied = vi.fn().mockResolvedValue(new Response("secret details", { status: 401 }));
    const err = await getGoogleAccessToken(env, denied as never).catch((e) => e);
    expect(err).toBeInstanceOf(GoogleAuthError);
    expect(err.kind).toBe("unauthorized");
    expect(String(err.message)).not.toContain("secret details");
    const down = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    await expect(getGoogleAccessToken(env, down as never)).rejects.toMatchObject({ kind: "network" });
  });
});
