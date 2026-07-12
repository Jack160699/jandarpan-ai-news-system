"use client";

import { MapPin, Cloud } from "lucide-react";
import { useGreeting } from "@/sections/homepage/v3/hooks/useGreeting";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import type { MorningBriefWeather } from "../types";

export type GreetingProps = {
  weather?: Pick<MorningBriefWeather, "condition" | "temperatureC" | "placeholder">;
};

export function Greeting({ weather }: GreetingProps) {
  const { label, date } = useGreeting();
  const { displayName } = useReaderAccount();
  const { prefs } = useReaderPreferences();
  const district =
    (prefs.homeDistrict ?? "raipur").charAt(0).toUpperCase() +
    (prefs.homeDistrict ?? "raipur").slice(1);

  const firstName = displayName.split(" ")[0];
  const weatherLabel = weather
    ? `${weather.condition} · ${weather.temperatureC}°C`
    : "Weather — coming soon";

  return (
    <header className="mb-greeting mb-enter" aria-label="Morning greeting">
      <p className="mb-greeting__kicker">Morning Brief</p>
      <h1 className="mb-greeting__title">
        {label}
        {firstName && firstName !== "Guest" ? `, ${firstName}` : ""}
      </h1>
      <div className="mb-greeting__meta">
        <span>{date}</span>
        <span aria-hidden>·</span>
        <span className="mb-greeting__meta-item">
          <MapPin size={14} aria-hidden />
          {district}
        </span>
        <span aria-hidden>·</span>
        <span className="mb-greeting__meta-item">
          <Cloud size={14} aria-hidden />
          {weatherLabel}
          {weather?.placeholder ? (
            <span className="mb-greeting__placeholder">Sample</span>
          ) : null}
        </span>
      </div>
    </header>
  );
}
