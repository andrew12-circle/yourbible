/**
 * Auto-capture context for new journal entries: geolocation, reverse geocoding,
 * and weather. All providers are keyless (Open-Meteo + OSM Nominatim).
 * Each call has a hard timeout and degrades gracefully — no error throws.
 */

export interface EntryContext {
  lat?: number;
  lng?: number;
  location_name?: string;
  weather?: string;
  weather_temp_c?: number;
  weather_icon?: string;
}

const SS_KEY = "journal-ctx-cache";

export async function getCurrentContext(timeoutMs = 8000): Promise<EntryContext> {
  if (!("geolocation" in navigator)) return {};
  const cached = readCache();
  if (cached) return cached;

  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(t);
        resolve(p);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
      { timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    );
  });
  if (!pos) return {};

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  const [name, weather] = await Promise.all([
    reverseGeocode(lat, lng).catch(() => undefined),
    fetchWeather(lat, lng).catch(() => undefined),
  ]);

  const ctx: EntryContext = {
    lat,
    lng,
    location_name: name,
    ...(weather ?? {}),
  };
  writeCache(ctx);
  return ctx;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
    { headers: { Accept: "application/json" } },
  );
  if (!r.ok) return undefined;
  const j = await r.json();
  const a = j?.address ?? {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const place = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || "";
  if (street && place) return `${street}, ${place}`;
  return street || place || j?.display_name?.split(",").slice(0, 2).join(",") || undefined;
}

async function fetchWeather(
  lat: number,
  lng: number,
): Promise<{ weather?: string; weather_temp_c?: number; weather_icon?: string } | undefined> {
  const r = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=celsius`,
  );
  if (!r.ok) return undefined;
  const j = await r.json();
  const t = j?.current?.temperature_2m;
  const code = j?.current?.weather_code;
  if (t == null) return undefined;
  const meta = wmoMeta(code);
  return {
    weather_temp_c: Math.round(t),
    weather_icon: meta.icon,
    weather: meta.label,
  };
}

/** Subset of WMO weather codes — https://open-meteo.com/en/docs */
function wmoMeta(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "sun", label: "Clear" };
  if (code <= 2) return { icon: "cloud-sun", label: "Mostly clear" };
  if (code === 3) return { icon: "cloud", label: "Cloudy" };
  if (code <= 48) return { icon: "cloud-fog", label: "Foggy" };
  if (code <= 57) return { icon: "cloud-drizzle", label: "Drizzle" };
  if (code <= 67) return { icon: "cloud-rain", label: "Rain" };
  if (code <= 77) return { icon: "snowflake", label: "Snow" };
  if (code <= 82) return { icon: "cloud-rain", label: "Showers" };
  if (code <= 86) return { icon: "snowflake", label: "Snow showers" };
  if (code <= 99) return { icon: "cloud-lightning", label: "Thunderstorm" };
  return { icon: "cloud", label: "Weather" };
}

function readCache(): EntryContext | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const { at, ctx } = JSON.parse(raw);
    if (Date.now() - at > 10 * 60 * 1000) return null;
    return ctx;
  } catch {
    return null;
  }
}
function writeCache(ctx: EntryContext) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify({ at: Date.now(), ctx }));
  } catch {
    /* ignore */
  }
}

export function formatTemp(c?: number | null): string {
  if (c == null) return "";
  const f = Math.round((c * 9) / 5 + 32);
  return `${f}°F`;
}