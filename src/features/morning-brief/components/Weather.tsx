import { CloudRain, Droplets, Thermometer } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { BriefCard } from "./BriefCard";
import type { MorningBriefWeather } from "../types";

export type WeatherProps = {
  weather: MorningBriefWeather;
};

export function Weather({ weather }: WeatherProps) {
  return (
    <BriefCard id="mb-weather" aria-labelledby="mb-weather-title">
      <SectionHeader title="Weather" kicker={weather.location} />
      <h2 id="mb-weather-title" className="sr-only">
        Weather for {weather.location}
      </h2>

      <div className="mb-weather">
        <div className="mb-weather__hero">
          <CloudRain size={32} className="mb-weather__icon" aria-hidden />
          <div>
            <p className="mb-weather__temp">{weather.temperatureC}°C</p>
            <p className="mb-weather__condition">{weather.condition}</p>
          </div>
          {weather.placeholder ? (
            <Badge variant="weather" className="mb-weather__badge">
              Sample data
            </Badge>
          ) : null}
        </div>

        <dl className="mb-weather__stats">
          <div className="mb-weather__stat">
            <dt>
              <Thermometer size={14} aria-hidden />
              High / Low
            </dt>
            <dd>
              {weather.highC}° / {weather.lowC}°
            </dd>
          </div>
          {weather.humidity != null ? (
            <div className="mb-weather__stat">
              <dt>
                <Droplets size={14} aria-hidden />
                Humidity
              </dt>
              <dd>{weather.humidity}%</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </BriefCard>
  );
}
