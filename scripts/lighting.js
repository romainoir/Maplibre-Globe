import { updateCelestialBodies } from './celestial.js';
import { updateNightLights } from './nightLights.js';
import { doyFromDate } from './timeUtils.js';

const toDeg = (radVal) => (radVal * 180) / Math.PI;
const toRad = (degVal) => (degVal * Math.PI) / 180;
const rad = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397;

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;

function applyTransitionEasing(t, typeA, typeB) {
  if (typeA === 'stable' && typeB === 'stable') {
    if (t < 0.3) return 0;
    if (t > 0.7) return 1;
    return (t - 0.3) / 0.4;
  }

  if (typeA === 'stable' || typeB === 'stable') {
    if (typeA === 'stable') {
      return t < 0.6 ? 0 : (t - 0.6) / 0.4;
    }
    return t < 0.4 ? t / 0.4 : 1;
  }

  if (typeA === 'fast' || typeB === 'fast') {
    return t < 0.5 ? 2 * t * t : 1 - (Math.pow(-2 * t + 2, 2) / 2);
  }

  return t;
}

function hexToRgb(hex) {
  const stripped = hex.replace('#', '');
  const values =
    stripped.length === 3
      ? stripped.split('').map((ch) => parseInt(ch + ch, 16))
      : [stripped.slice(0, 2), stripped.slice(2, 4), stripped.slice(4, 6)].map(
          (chunk) => parseInt(chunk, 16),
        );

  return { r: values[0], g: values[1], b: values[2] };
}

function rgbToHex({ r, g, b }) {
  const clamp = (value) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

const mixHex = (a, b, t) => {
  const colorA = hexToRgb(a);
  const colorB = hexToRgb(b);
  return rgbToHex({
    r: lerp(colorA.r, colorB.r, t),
    g: lerp(colorA.g, colorB.g, t),
    b: lerp(colorA.b, colorB.b, t),
  });
};

const SKY_KEYS = [
  'sky-color',
  'horizon-color',
  'fog-color',
  'sky-horizon-blend',
  'horizon-fog-blend',
  'fog-ground-blend',
  'atmosphere-blend',
];

function blendPresets(pA, pB, t, easedT) {
  const blended = {};
  const colorKeys = [
    'sky-color',
    'horizon-color',
    'fog-color',
    'light-color',
    'hillshade-highlight',
    'hillshade-shadow',
  ];
  const numericKeys = [
    'sky-horizon-blend',
    'horizon-fog-blend',
    'fog-ground-blend',
    'light-intensity',
  ];

  colorKeys.forEach((key) => {
    const a = pA[key] ?? pB[key];
    const b = pB[key] ?? pA[key];
    if (a && b) blended[key] = mixHex(a, b, easedT);
  });

  numericKeys.forEach((key) => {
    const a = pA[key] ?? pB[key];
    const b = pB[key] ?? pA[key];
    if (a !== undefined && b !== undefined) blended[key] = lerp(a, b, easedT);
  });

  const prefer = t < 0.5 ? pA : pB;
  Object.keys({ ...pA, ...pB }).forEach((key) => {
    if (blended[key] === undefined) blended[key] = prefer[key];
  });

  return blended;
}

function withZoomEasing(props) {
  return {
    ...props,
    'sky-horizon-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      props['sky-horizon-blend'],
      6,
      props['sky-horizon-blend'],
      10,
      Math.max(0.3, props['sky-horizon-blend'] - 0.2),
    ],
    'horizon-fog-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      props['horizon-fog-blend'],
      6,
      props['horizon-fog-blend'],
      10,
      Math.max(0.3, props['horizon-fog-blend'] - 0.2),
    ],
    'fog-ground-blend': [
      'interpolate',
      ['linear'],
      ['zoom'],
      0,
      Math.max(0, props['fog-ground-blend'] - 0.2),
      6,
      props['fog-ground-blend'],
      10,
      Math.min(1, props['fog-ground-blend'] + 0.1),
    ],
  };
}

function getBlendingFor(date, lat, lon, options) {
  const order = [
    'nadir',
    'nightEnd',
    'nauticalDawn',
    'dawn',
    'sunrise',
    'sunriseEnd',
    'goldenHourEnd',
    'solarNoon',
    'goldenHour',
    'sunsetStart',
    'sunset',
    'dusk',
    'nauticalDusk',
    'night',
  ];

  const t0 = date.getTime();
  const phases = [];

  [-1, 0, 1].forEach((offset) => {
    const day = new Date(t0 + offset * 86400000);
    const times = SunCalc.getTimes(day, lat, lon);

    order.forEach((key) => {
      if (!options[key]) return;
      const time = times[key];
      if (time instanceof Date) {
        phases.push({ key, time: time.getTime() });
      }
    });
  });

  phases.sort((a, b) => a.time - b.time);
  if (phases.length < 2) return null;

  let idx = phases.findIndex((phase) => phase.time > t0);
  if (idx === -1) idx = phases.length - 1;

  const a = phases[Math.max(0, idx - 1)];
  const b = phases[idx % phases.length];
  const span = Math.max(1, b.time - a.time);
  const t = clamp01((t0 - a.time) / span);

  return { a, b, t };
}

function computeAutoSky(date, lat, lon, options) {
  const blend = getBlendingFor(date, lat, lon, options);
  if (!blend) return null;

  const presetA = options[blend.a.key];
  const presetB = options[blend.b.key];
  const typeA = presetA.transitionType || 'normal';
  const typeB = presetB.transitionType || 'normal';
  const easedT = applyTransitionEasing(blend.t, typeA, typeB);

  return {
    keyA: blend.a.key,
    keyB: blend.b.key,
    t: blend.t,
    easedT,
    blended: blendPresets(presetA, presetB, blend.t, easedT),
  };
}

export function applyAutoSky(map, date, lat, lon, options, { zoomEasing = true } = {}) {
  const result = computeAutoSky(date, lat, lon, options);
  if (!result || !map) return result;

  const subsolarPoint = getSubsolarPoint(date);
  const lightPosition = latLonToLightPosition(subsolarPoint.lat, subsolarPoint.lon);

  const skyProps = {};
  const lightColor = result.blended['light-color'] || '#ffffff';
  const lightIntensity = result.blended['light-intensity'] || 0.5;

  SKY_KEYS.forEach((key) => {
    if (result.blended[key] !== undefined) {
      skyProps[key] = result.blended[key];
    }
  });

  map.setLight({
    anchor: 'map',
    position: lightPosition,
    color: lightColor,
    intensity: lightIntensity,
  });

  map.setSky(zoomEasing ? withZoomEasing(skyProps) : skyProps);

  const sunDirection = lightPosition[1];

  if (map.getLayer('hills')) {
    map.setPaintProperty('hills', 'hillshade-illumination-direction', sunDirection);

    if (result.blended['hillshade-highlight']) {
      map.setPaintProperty(
        'hills',
        'hillshade-highlight-color',
        result.blended['hillshade-highlight'],
      );
    }
    if (result.blended['hillshade-shadow']) {
      map.setPaintProperty(
        'hills',
        'hillshade-shadow-color',
        result.blended['hillshade-shadow'],
      );
    }
  }

  updateNightLights(map, lightIntensity);
  updateCelestialBodies(map, date, lat, lon);

  return result;
}

export { computeAutoSky };

function getSubsolarPoint(date) {
  const d = toDays(date);
  const coords = sunCoords(d);
  const gmst = (280.16 + 360.9856235 * d) % 360;
  let lon = toDeg(coords.ra) - gmst;
  lon = ((lon + 180) % 360) - 180;
  const lat = toDeg(coords.dec);
  return { lat, lon };
}

function latLonToLightPosition(latDeg, lonDeg) {
  let azimuth = (180 - lonDeg + 360) % 360;
  let polar = 90 - latDeg;
  polar = Math.max(0, Math.min(180, polar));
  return [1.5, azimuth, polar];
}

function toJulian(date) {
  return date.valueOf() / dayMs - 0.5 + J1970;
}

function toDays(date) {
  return toJulian(date) - J2000;
}

function rightAscension(l, b) {
  return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
}

function declination(l, b) {
  return Math.asin(
    Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l),
  );
}

function solarMeanAnomaly(d) {
  return rad * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  const C =
    rad *
    (1.9148 * Math.sin(M) +
      0.02 * Math.sin(2 * M) +
      0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372;
  return M + C + P + Math.PI;
}

function sunCoords(d) {
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  return {
    ra: rightAscension(L, 0),
    dec: declination(L, 0),
  };
}
