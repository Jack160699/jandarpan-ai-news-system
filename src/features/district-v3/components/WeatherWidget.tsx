import { CloudRain, Droplets, Thermometer } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { DistrictCard } from "./DistrictCard";
import type { DistrictWeather } from "../types";

export type WeatherWidgetProps = {
  weather: DistrictWeather;
};

/**
 * Weather widget — placeholder data until live weather API connects.
 */
export function WeatherWidget({ weather }: WeatherWidgetProps) {
  return (
    <DistrictCard id="dv3-weather" aria-labelledby="dv3-weather-title">
      <SectionHeader title="Weather" kicker={weather.location} />
      <h2 id="dv3-weather-title" className="sr-only">
        Weather for {weather.location}
      </h2>

      <div className="dv3-weather">
        <div className="dv3-weather__hero">
          <CloudRain size={32} className="dv3-weather__icon" aria-hidden />
          <div>
            <p className="dv3-weather__temp">{weather.temperatureC}°C</p>
            <p className="dv3-weather__condition">{weather.condition}</p>
          </div>
          {weather.placeholder ? (
            <Badge variant="weather" className="dv3-weather__badge">
              Placeholder
            </Badge>
          ) : null}
        </div>

        <dl className="dv3-weather__stats">
          <div className="dv3-weather__stat">
            <dt>
              <Thermometer size={14} aria-hidden />
              High / Low
            </dt>
            <dd>
              {weather.highC}° / {weather.lowC}°
            </dd>
          </div>
          {weather.humidity != null ? (
            <div className="dv3-weather__stat">
              <dt>
                <Droplets size={14} aria-hidden />
                Humidity
              </dt>
              <dd>{weather.humidity}%</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <p className="dv3-placeholder-note">Live weather data coming soon.</p>
    </DistrictCard>
  );
}
