"use client";

import { useMemo } from "react";

export type GreetingPeriod = "morning" | "afternoon" | "evening";

export function getGreetingPeriod(date = new Date()): GreetingPeriod {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

const GREETINGS: Record<GreetingPeriod, string> = {
  morning: "Good Morning",
  afternoon: "Good Afternoon",
  evening: "Good Evening",
};

export function useGreeting() {
  return useMemo(() => {
    const now = new Date();
    const period = getGreetingPeriod(now);
    return {
      period,
      label: GREETINGS[period],
      date: now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    };
  }, []);
}
