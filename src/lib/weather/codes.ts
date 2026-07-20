/** WMO weather interpretation — shared client/server, no I/O. */

export function conditionHiFromCode(code: number): string {
  if (code === 0) return "साफ़";
  if (code <= 2) return "आंशिक बादल";
  if (code === 3) return "बादल";
  if (code <= 48) return "कोहरा";
  if (code <= 57) return "बूंदाबांदी";
  if (code <= 67) return "बारिश";
  if (code <= 77) return "बर्फ़";
  if (code <= 82) return "तेज़ बारिश";
  if (code <= 86) return "बर्फ़बारी";
  return "आंधी-तूफ़ान";
}

export function conditionEnFromCode(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Heavy rain";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

export function weatherIconName(code: number | null, isDay: boolean | null): "sun" | "rain" {
  if (code == null) return "rain";
  if (code <= 2 && isDay !== false) return "sun";
  return "rain";
}
