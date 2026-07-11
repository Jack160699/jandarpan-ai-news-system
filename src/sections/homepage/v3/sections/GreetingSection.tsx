"use client";

import { MapPin, Cloud } from "lucide-react";
import { useGreeting } from "../hooks/useGreeting";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

export function GreetingSection() {
  const { label, date } = useGreeting();
  const { displayName } = useReaderAccount();
  const { prefs } = useReaderPreferences();
  const district =
    (prefs.homeDistrict ?? "raipur").charAt(0).toUpperCase() +
    (prefs.homeDistrict ?? "raipur").slice(1);

  const firstName = displayName.split(" ")[0];

  return (
    <section className="home-v3__section home-v3__enter" aria-label="Greeting">
      <div className="home-v3-greeting">
        <h2 className="home-v3-greeting__title">
          {label}
          {firstName && firstName !== "Guest" ? `, ${firstName}` : ""}
        </h2>
        <div className="home-v3-greeting__meta">
          <span>{date}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} aria-hidden />
            {district}
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Cloud size={14} aria-hidden />
            Weather — coming soon
          </span>
        </div>
      </div>
    </section>
  );
}
