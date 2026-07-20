import { describe, expect, it, vi } from "vitest";
import {
  fetchDistrictWeather,
  isWeatherStale,
  markStaleIfNeeded,
  parseOpenMeteoPayload,
  toWeatherApiJson,
} from "@/lib/weather/open-meteo";
import { resolveWeatherDistrict } from "@/lib/weather/open-meteo";
import { WEATHER_MAX_AGE_MS, WEATHER_SOURCE } from "@/lib/weather/types";
import { buildA1UtilitiesSnapshot, buildHonestA1Rates } from "@/features/reader-ds/data/a1-utilities";
import { conditionEnFromCode, conditionHiFromCode, weatherIconName } from "@/lib/weather/codes";
import { JD_DS_STRINGS } from "@/features/reader-ds/i18n/strings";

describe("open-meteo weather contract", () => {
  it("parses a valid Open-Meteo response", () => {
    const district = resolveWeatherDistrict("raipur");
    const snap = parseOpenMeteoPayload(district, {
      current: { temperature_2m: 32.4, weather_code: 0, is_day: 1 },
    });
    expect(snap.status).toBe("ok");
    expect(snap.tempC).toBe(32);
    expect(snap.conditionHi).toBe(conditionHiFromCode(0));
    expect(snap.conditionEn).toBe(conditionEnFromCode(0));
    expect(snap.source).toBe(WEATHER_SOURCE);
    expect(snap.stale).toBe(false);
    expect(toWeatherApiJson(snap).ok).toBe(true);
  });

  it("rejects malformed payload without inventing temp", () => {
    const district = resolveWeatherDistrict("bilaspur");
    const snap = parseOpenMeteoPayload(district, { current: {} });
    expect(snap.status).toBe("invalid");
    expect(snap.tempC).toBeNull();
    expect(toWeatherApiJson(snap)).toMatchObject({ ok: false });
  });

  it("returns timeout status when fetch aborts", async () => {
    const fetchImpl = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const controller = new AbortController();
    const pending = fetchDistrictWeather({
      districtSlug: "raipur",
      signal: controller.signal,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      revalidateSec: 0,
    });
    controller.abort();
    const snap = await pending;
    expect(snap.status).toBe("timeout");
    expect(snap.tempC).toBeNull();
  });

  it("handles upstream HTTP failure without fake data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    const snap = await fetchDistrictWeather({
      districtSlug: "raipur",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      revalidateSec: 0,
    });
    expect(snap.status).toBe("unavailable");
    expect(snap.tempC).toBeNull();
  });

  it("does not require API credentials (Open-Meteo)", async () => {
    expect(process.env.OPEN_METEO_API_KEY).toBeUndefined();
    expect(process.env.WEATHER_API_KEY).toBeUndefined();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: { temperature_2m: 28, weather_code: 61, is_day: 1 },
      }),
    });
    const snap = await fetchDistrictWeather({
      districtSlug: "durg",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(snap.status).toBe("ok");
    expect(snap.tempC).toBe(28);
    const calledUrl = String(fetchImpl.mock.calls[0]?.[0] ?? "");
    expect(calledUrl).toContain("api.open-meteo.com");
    expect(calledUrl).not.toMatch(/key=|apikey=|secret=/i);
  });

  it("marks data stale beyond max age and clears display values", () => {
    const district = resolveWeatherDistrict("raipur");
    const fresh = parseOpenMeteoPayload(district, {
      current: { temperature_2m: 30, weather_code: 1, is_day: 1 },
    });
    const oldFetched = new Date(Date.now() - WEATHER_MAX_AGE_MS - 1_000).toISOString();
    const aged = { ...fresh, fetchedAt: oldFetched };
    expect(isWeatherStale(oldFetched)).toBe(true);
    const marked = markStaleIfNeeded(aged);
    expect(marked.stale).toBe(true);
    expect(marked.status).toBe("unavailable");
    expect(marked.tempC).toBeNull();
  });

  it("falls back to Raipur for unknown district slugs", () => {
    const d = resolveWeatherDistrict("not-a-real-district-xyz");
    expect(d.slug).toBe("raipur");
  });

  it("maps icons without inventing weather", () => {
    expect(weatherIconName(0, true)).toBe("sun");
    expect(weatherIconName(61, true)).toBe("rain");
  });
});

describe("A1 utilities rates contract", () => {
  it("omits fabricated rates and keeps weather-only snapshots honest", () => {
    const district = resolveWeatherDistrict("raipur");
    const weather = parseOpenMeteoPayload(district, {
      current: { temperature_2m: 31, weather_code: 0, is_day: 1 },
    });
    const snap = buildA1UtilitiesSnapshot({ weather, rates: [] });
    expect(snap.hasHonestRates).toBe(false);
    expect(snap.rates).toEqual([]);
    expect(snap.weather?.tempC).toBe(31);
  });

  it("filters non-ok rate tiles", () => {
    const honest = buildHonestA1Rates([
      {
        id: "gold",
        labelHi: "सोना",
        labelEn: "Gold",
        value: "₹72,000",
        source: "test",
        fetchedAt: new Date().toISOString(),
        status: "ok",
        stale: false,
      },
      {
        id: "silver",
        labelHi: "चांदी",
        labelEn: "Silver",
        value: "₹90,000",
        source: "test",
        fetchedAt: null,
        status: "unavailable",
        stale: false,
      },
    ]);
    expect(honest).toHaveLength(1);
    expect(honest[0]?.id).toBe("gold");
  });

  it("never ships placeholder market numbers via empty homepage path", () => {
    const empty = buildA1UtilitiesSnapshot({});
    expect(empty.rates).toEqual([]);
    expect(empty.hasHonestRates).toBe(false);
    expect(JSON.stringify(empty)).not.toMatch(/72000|₹\s*7|32°|placeholder/i);
  });
});

describe("A1 i18n labels", () => {
  it("exposes Hindi and English weather/rate strings", () => {
    expect(JD_DS_STRINGS.hi["util.weatherUnavailable"]).toBeTruthy();
    expect(JD_DS_STRINGS.en["util.weatherUnavailable"]).toBeTruthy();
    expect(JD_DS_STRINGS.hi["util.rateGold"]).toContain("सोना");
    expect(JD_DS_STRINGS.en["util.rateGold"]).toMatch(/Gold/i);
    expect(JD_DS_STRINGS.hi["util.weatherLoading"]).toBeTruthy();
    expect(JD_DS_STRINGS.en["util.weatherLoading"]).toBeTruthy();
  });
});

describe("reader DS flag posture for A1", () => {
  it("documents that market tiles stay empty without live feeds regardless of flag", () => {
    const snap = buildA1UtilitiesSnapshot({ rates: [] });
    expect(snap.hasHonestRates).toBe(false);
  });
});
