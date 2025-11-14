import { doyFromDate } from './timeUtils.js';

const MOON_PHASES = [
  { threshold: 6, label: 'New' },
  { threshold: 19, label: 'Waxing Crescent' },
  { threshold: 31, label: 'First Quarter' },
  { threshold: 44, label: 'Waxing Gibbous' },
  { threshold: 56, label: 'Full' },
  { threshold: 69, label: 'Waning Gibbous' },
  { threshold: 81, label: 'Last Quarter' },
  { threshold: 94, label: 'Waning Crescent' },
];

const MOON_EMOJI_PHASES = [
  { max: 0.03, emoji: '🌑' },
  { max: 0.22, emoji: '🌒' },
  { max: 0.28, emoji: '🌓' },
  { max: 0.47, emoji: '🌔' },
  { max: 0.53, emoji: '🌕' },
  { max: 0.72, emoji: '🌖' },
  { max: 0.78, emoji: '🌗' },
  { max: 0.97, emoji: '🌘' },
  { max: 1.01, emoji: '🌑' },
];

const DEGREE = '\u00B0';
const rad = Math.PI / 180;
const dayMs = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397;

const toDeg = (radVal) => (radVal * 180) / Math.PI;
const formatDegrees = (value) => `${value.toFixed(1)}${DEGREE}`;

export function updateCelestialBodies(map, date, centerLat, centerLng) {
  const sunPos = SunCalc.getPosition(date, centerLat, centerLng);
  const moonPos = SunCalc.getMoonPosition(date, centerLat, centerLng);
  const moonIllum = SunCalc.getMoonIllumination(date);

  const sunAlt = toDeg(sunPos.altitude);
  const sunAz = toDeg(sunPos.azimuth);
  const moonAlt = toDeg(moonPos.altitude);
  const moonAz = toDeg(moonPos.azimuth);

  const sunInfo = document.getElementById('sunInfo');
  const moonInfo = document.getElementById('moonInfo');

  if (sunInfo) {
    sunInfo.textContent = `Alt: ${formatDegrees(sunAlt)} | Az: ${formatDegrees(sunAz)}`;
  }

  if (moonInfo) {
    const moonPhase = Math.round(moonIllum.phase * 100);
    const phaseEmoji = getMoonEmoji(moonIllum.phase);
    const phaseLabel = describeMoonPhase(moonPhase);
    moonInfo.textContent = `${phaseEmoji} ${phaseLabel} (${moonPhase}%) | Alt: ${formatDegrees(moonAlt)} | Az: ${formatDegrees(moonAz)}`;
  }

  if (!map) return;

  const subsolar = getSubsolarPoint(date);

  if (map.getSource('sun-marker')) {
    map.getSource('sun-marker').setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [subsolar.lon, subsolar.lat],
          },
          properties: {
            altitude: sunAlt,
          },
        },
      ],
    });
  }

  if (map.getSource('moon-marker')) {
    const utcDecimalHours = date.getUTCHours() + date.getUTCMinutes() / 60;
    let sunLng = 180 - utcDecimalHours * 15;
    if (sunLng > 180) sunLng -= 360;
    if (sunLng < -180) sunLng += 360;

    let moonLng = sunLng + moonIllum.phase * 360;
    if (moonLng > 180) moonLng -= 360;
    if (moonLng < -180) moonLng += 360;

    const dayOfYear = doyFromDate(date);
    const moonLat =
      23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365.25) +
      Math.sin(moonIllum.phase * Math.PI * 2) * 5;

    map.getSource('moon-marker').setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [moonLng, moonLat] },
          properties: {
            phase: Math.round(moonIllum.phase * 100),
            altitude: moonAlt,
            emoji: getMoonEmoji(moonIllum.phase),
          },
        },
      ],
    });
  }
}

function describeMoonPhase(phasePercentage) {
  const phase = MOON_PHASES.find((entry) => phasePercentage < entry.threshold);
  return `${phase?.label ?? 'New'} Moon`;
}

function getMoonEmoji(fraction) {
  const phase = MOON_EMOJI_PHASES.find((entry) => fraction < entry.max);
  return phase?.emoji ?? '🌑';
}

function getSubsolarPoint(date) {
  const d = toDays(date);
  const coords = sunCoords(d);
  const gmst = (280.16 + 360.9856235 * d) % 360;
  let lon = toDeg(coords.ra) - gmst;
  lon = ((lon + 180) % 360) - 180;
  const lat = toDeg(coords.dec);
  return { lat, lon };
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
  return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
}

function solarMeanAnomaly(d) {
  return rad * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M) {
  const C =
    rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
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
