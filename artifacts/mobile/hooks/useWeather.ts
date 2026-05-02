import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

export interface WeatherData {
  tempC: number;
  feelsLikeC: number;
  tempMinC: number;
  tempMaxC: number;
  condition: string;
  conditionEmoji: string;
  windKph: number;
  precipMm: number;
  locationName?: string;
}

// WMO weather interpretation codes → label + emoji
const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "Clear sky",          emoji: "☀️" },
  1:  { label: "Mainly clear",       emoji: "🌤️" },
  2:  { label: "Partly cloudy",      emoji: "⛅️" },
  3:  { label: "Overcast",           emoji: "☁️" },
  45: { label: "Foggy",              emoji: "🌫️" },
  48: { label: "Icy fog",            emoji: "🌫️" },
  51: { label: "Light drizzle",      emoji: "🌦️" },
  53: { label: "Drizzle",            emoji: "🌦️" },
  55: { label: "Heavy drizzle",      emoji: "🌧️" },
  61: { label: "Light rain",         emoji: "🌧️" },
  63: { label: "Rain",               emoji: "🌧️" },
  65: { label: "Heavy rain",         emoji: "🌧️" },
  71: { label: "Light snow",         emoji: "🌨️" },
  73: { label: "Snow",               emoji: "❄️" },
  75: { label: "Heavy snow",         emoji: "❄️" },
  80: { label: "Rain showers",       emoji: "🌦️" },
  81: { label: "Rain showers",       emoji: "🌦️" },
  82: { label: "Heavy showers",      emoji: "⛈️" },
  95: { label: "Thunderstorm",       emoji: "⛈️" },
  96: { label: "Thunderstorm + hail",emoji: "⛈️" },
  99: { label: "Thunderstorm + hail",emoji: "⛈️" },
};

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setError("Location permission denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
        `&timezone=auto&forecast_days=1`;

      const res = await fetch(url);
      const data = await res.json();

      const code: number = data.current.weathercode ?? 0;
      const wmo = WMO[code] ?? { label: "Unknown", emoji: "🌡️" };

      let locationName: string | undefined;
      try {
        const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo[0]) locationName = geo[0].city ?? geo[0].region ?? undefined;
      } catch { /* not critical */ }

      setWeather({
        tempC:       Math.round(data.current.temperature_2m),
        feelsLikeC:  Math.round(data.current.apparent_temperature),
        tempMinC:    Math.round(data.daily.temperature_2m_min[0]),
        tempMaxC:    Math.round(data.daily.temperature_2m_max[0]),
        condition:   wmo.label,
        conditionEmoji: wmo.emoji,
        windKph:     Math.round(data.current.windspeed_10m),
        precipMm:    data.daily.precipitation_sum[0] ?? 0,
        locationName,
      });
    } catch {
      setError("Could not load weather");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWeather(); }, []);

  return { weather, loading, error, permissionDenied, refresh: fetchWeather };
}
