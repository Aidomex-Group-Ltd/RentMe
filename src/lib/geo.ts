/**
 * Shared geospatial helpers for the inspection tracker (Stage 6).
 *
 * Single source of truth for distance math — used by the client hook
 * (arrival detection UI) and the server route (waypoint validation and
 * server-side arrival authority). Position data is navigational
 * assistance only; it never mutates listing ownership or trust signals.
 */

/** Earth's mean radius in meters. */
const EARTH_RADIUS_M = 6_371_000;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate distance between two coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

/**
 * Arrival gate used by both the live tracker UI and the server.
 * A waypoint counts as "arrived" only when its computed distance to the
 * property falls within the session radius (default 50 m).
 */
export function isWithinArrivalRadius(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusM: number
): boolean {
  return calculateDistanceMeters(lat1, lon1, lat2, lon2) <= radiusM;
}
