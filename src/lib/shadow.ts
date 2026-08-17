/**
 * "Which side of the street is shaded" — a lightweight approximation, not a
 * true building-height shadow simulation. There's no free worldwide API for
 * per-building heights, so instead of pretending otherwise, this uses the
 * street's own bearing plus the sun's real position (time + rough location)
 * and the standard pedestrian rule of thumb: the sidewalk facing away from
 * the sun is the shaded one. It only covers the walking-route/street lines
 * already in our data (from the KML import), not a full city road network.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

type LatLng = { lat: number; lng: number };

/** NOAA's simplified solar position formulas — accurate enough for a UX
 * heuristic, not survey-grade. Returns both azimuth (0=north, 90=east) and
 * elevation (degrees above the horizon; <=0 means the sun hasn't risen yet
 * or has already set) for the given real date/time and location, so callers
 * can tell "which side is shaded" apart from "is it even daytime." */
export function sunPosition(date: Date, latDeg: number, lngDeg: number): { azimuthDeg: number; elevationDeg: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000) + 1;
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);

  const eqTimeMin =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const trueSolarTimeMin = (((utcMinutes + eqTimeMin + 4 * lngDeg) % 1440) + 1440) % 1440;
  const hourAngleDeg = trueSolarTimeMin / 4 - 180;
  const hourAngle = hourAngleDeg * RAD;

  const latRad = latDeg * RAD;
  const cosZenith = Math.sin(latRad) * Math.sin(decl) + Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)));

  let cosAzimuth = (Math.sin(decl) - Math.sin(latRad) * Math.cos(zenith)) / (Math.cos(latRad) * Math.sin(zenith) || 1);
  cosAzimuth = Math.min(1, Math.max(-1, cosAzimuth));
  let azimuth = Math.acos(cosAzimuth) * DEG;
  if (hourAngleDeg > 0) azimuth = 360 - azimuth;
  return { azimuthDeg: azimuth, elevationDeg: 90 - zenith * DEG };
}

/** @deprecated kept for call sites that only need the azimuth — prefer
 * sunPosition() when elevation (is-it-daytime) also matters. */
export function sunAzimuthDeg(date: Date, latDeg: number, lngDeg: number): number {
  return sunPosition(date, latDeg, lngDeg).azimuthDeg;
}

function bearingDeg(a: LatLng, b: LatLng): number {
  const phi1 = a.lat * RAD;
  const phi2 = b.lat * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * DEG) % 360 + 360) % 360;
}

function angularDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function offsetPerpendicular(p: LatLng, bearing: number, meters: number): LatLng {
  const R = 6371000;
  const perpBearing = (bearing + 90) * RAD;
  const delta = meters / R;
  const phi1 = p.lat * RAD;
  const lambda1 = p.lng * RAD;
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(perpBearing));
  const lambda2 =
    lambda1 + Math.atan2(Math.sin(perpBearing) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2));
  return { lat: phi2 * DEG, lng: lambda2 * DEG };
}

const SIDEWALK_OFFSET_METERS = 4;

/** Builds an offset path tracing the shaded sidewalk of a street, segment by
 * segment (each segment picks whichever side faces away from the sun). */
export function shadedSidePath(path: LatLng[], sunAzimuth: number): LatLng[] {
  const out: LatLng[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    const bearing = bearingDeg(a, b);
    const sideA = (bearing + 90) % 360;
    const sideB = (bearing + 270) % 360;
    const shadedBearing = angularDiff(sideA, sunAzimuth) > angularDiff(sideB, sunAzimuth) ? sideA : sideB;
    out.push(offsetPerpendicular(a, shadedBearing, SIDEWALK_OFFSET_METERS));
    out.push(offsetPerpendicular(b, shadedBearing, SIDEWALK_OFFSET_METERS));
  }
  return out;
}
