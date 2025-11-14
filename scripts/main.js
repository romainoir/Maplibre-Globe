import { skyOptions } from './skyPresets.js';
import { applyAutoSky } from './lighting.js';
import { initializeMapLayers } from './mapLayers.js';
import { setNightLightScales } from './nightLights.js';
import STYLE_PRESET from './stylePreset.js';
import {
  dateFromYearAndDoy,
  doyFromDate,
  fmtDate,
  fmtTime,
  isLeap,
  minutesOfDayFromDate,
  setLocalTime,
} from './timeUtils.js';

const HEATMAP_LAYER_MAP = {
  residential: 'urban-heatmap-residential',
  roads: 'urban-heatmap-roads',
  buildings: 'urban-heatmap-buildings',
};

const VECTOR_FAMILIES = [
  {
    id: 'motorways',
    layer: 'night-motorways-core',
    derived: [
      { layerId: 'night-motorways-core', factor: 1 },
      { layerId: 'night-motorways-glow', factor: 0.35 },
      { layerId: 'night-motorways-glow-outer', factor: 0.12 },
    ],
  },
  {
    id: 'roads',
    layer: 'night-roads-core',
    derived: [
      { layerId: 'night-roads-core', factor: 1 },
      { layerId: 'night-roads-glow', factor: 0.35 },
      { layerId: 'night-roads-glow-outer', factor: 0.12 },
    ],
  },
];

const EARTH_CIRCUMFERENCE = 40075016.686;
const MINUTES_PER_DAY = 1440;

const radiusListenerKey = '__staticRadiusListener';
const currentYear = new Date().getFullYear();
const doyInput = document.getElementById('doy');
const minutesInput = document.getElementById('minutes');
const dateValue = document.getElementById('dateValue');
const timeValue = document.getElementById('timeValue');
const timeGradient = document.getElementById('timeGradient');

function reflectLabels(dayOfYear, minutes) {
  const date = setLocalTime(dateFromYearAndDoy(currentYear, dayOfYear), minutes);
  dateValue.textContent = fmtDate(date);
  timeValue.textContent = fmtTime(date);
}

function clampDayOfYear(day) {
  const max = isLeap(currentYear) ? 366 : 365;
  if (day > max) day = max;
  doyInput.max = max;
  return day;
}

function currentSliderDate() {
  const day = clampDayOfYear(Number(doyInput.value));
  const minutes = Number(minutesInput.value);
  const date = setLocalTime(dateFromYearAndDoy(currentYear, day), minutes);
  reflectLabels(day, minutes);
  return date;
}

function onAnyChange() {
  const map = window.map;
  if (!map) return;
  const date = currentSliderDate();
  const center = map.getCenter();
  applyAutoSky(map, date, center.lat, center.lng, skyOptions, { zoomEasing: true });
  updateSunEvents(date, center.lat, center.lng);
}

function initControls() {
  const now = new Date();
  doyInput.value = doyFromDate(now);
  minutesInput.value = minutesOfDayFromDate(now);
  clampDayOfYear(Number(doyInput.value));
  reflectLabels(Number(doyInput.value), Number(minutesInput.value));

  ['input', 'change'].forEach((evt) => {
    doyInput.addEventListener(evt, onAnyChange);
    minutesInput.addEventListener(evt, onAnyChange);
  });
}

async function loadBaseStyle() {
  const response = await fetch('./styles/osm_globe.json');
  if (!response.ok) {
    throw new Error(`Failed to load style: ${response.status}`);
  }

  return response.json();
}

function buildCustomStyle(osmStyle, demSource) {
  const keepCategories = [
    'background',
    'park',
    'landuse',
    'landcover',
    'waterway',
    'water',
    'aeroway',
    'road',
    'tunnel',
    'bridge',
    'railway',
    'building-3d',
  ];

  const filteredLayers = osmStyle.layers.filter((layer) => {
    const id = layer.id.toLowerCase();
    return keepCategories.some((cat) => id.includes(cat));
  });

  const nonBuildingLayers = filteredLayers.filter(
    (layer) => !layer.id.toLowerCase().includes('building-3d'),
  );
  const buildingLayers = filteredLayers.filter((layer) =>
    layer.id.toLowerCase().includes('building-3d'),
  );

  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: osmStyle.glyphs,
    sprite: osmStyle.sprite,
    sky: {
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 18, 1],
    },
    sources: {
      openmaptiles: {
        type: 'vector',
        url: 'https://tiles.openfreemap.org/planet',
      },
      terrainSource: { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json', tileSize: 512 },
      hillshadeSource: { type: 'raster-dem', url: 'https://tiles.mapterhorn.com/tilejson.json', tileSize: 512 },
      contourSource: {
        type: 'vector',
        tiles: [
          demSource.contourProtocolUrl({
            thresholds: {
              11: [200, 1000],
              12: [100, 500],
              14: [50, 200],
              15: [20, 100],
            },
            elevationKey: 'ele',
            levelKey: 'level',
            contourLayer: 'contours',
            buffer: 1,
            overzoom: 2,
          }),
        ],
        maxzoom: 17,
      },
    },
    layers: [
      ...nonBuildingLayers,
      {
        id: 'color-relief',
        type: 'color-relief',
        source: 'terrainSource',
        paint: {
          'color-relief-opacity': 0.8,
          'color-relief-color': [
            'interpolate',
            ['linear'],
            ['elevation'],
            -200,
            'rgb(  2,  10,  20)',
            0,
            'rgb(  5,  15,  25)',
            50,
            'rgb( 12,  22,  15)',
            200,
            'rgb( 18,  30,  18)',
            500,
            'rgb( 25,  35,  20)',
            1000,
            'rgb( 35,  38,  28)',
            1500,
            'rgb( 40,  38,  30)',
            2000,
            'rgb( 45,  40,  32)',
            2500,
            'rgb( 38,  38,  38)',
            3000,
            'rgb( 32,  32,  32)',
            4000,
            'rgb( 42,  42,  45)',
            5000,
            'rgb( 52,  52,  55)',
          ],
        },
      },
      {
        id: 'hills',
        type: 'hillshade',
        source: 'hillshadeSource',
        paint: {
          'hillshade-method': 'standard',
          'hillshade-exaggeration': 0.5,
          'hillshade-highlight-color': '#FFFFFF',
          'hillshade-shadow-color': '#5D4F6D',
          'hillshade-illumination-direction': 315,
          'hillshade-illumination-anchor': 'map',
        },
      },
      {
        id: 'contours',
        type: 'line',
        source: 'contourSource',
        'source-layer': 'contours',
        minzoom: 11,
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.4)',
          'line-width': ['match', ['get', 'level'], 1, 1.2, 0.6],
        },
      },
      {
        id: 'contour-text',
        type: 'symbol',
        source: 'contourSource',
        'source-layer': 'contours',
        minzoom: 13,
        filter: ['==', ['get', 'level'], 1],
        layout: {
          'symbol-placement': 'line',
          'text-size': 11,
          'text-field': ['concat', ['number-format', ['get', 'ele'], {}], 'm'],
          'text-font': ['Noto Sans Regular'],
        },
        paint: {
          'text-color': 'rgba(255, 255, 255, 0.7)',
          'text-halo-color': 'rgba(0, 0, 0, 0.8)',
          'text-halo-width': 1.5,
        },
      },
      ...buildingLayers,
    ],
    terrain: { source: 'terrainSource', exaggeration: 1 },
  };
}

async function initMap() {
  const demSource = new mlcontour.DemSource({
    url: 'https://tiles.mapterhorn.com/{z}/{x}/{y}.webp',
    encoding: 'terrarium',
    maxzoom: 12,
    worker: true,
  });
  demSource.setupMaplibre(maplibregl);

  try {
    const osmStyle = await loadBaseStyle();
    const customStyle = buildCustomStyle(osmStyle, demSource);

    const mapInstance = new maplibregl.Map({
      container: 'map',
      hash: true,
      center: [137.9150899566626, 36.25956997955441],
      zoom: 2,
      pitch: 0,
      style: customStyle,
      maxZoom: 18,
      maxPitch: 90,
      canvasContextAttributes: { antialias: true },
    });

    window.map = mapInstance;

    mapInstance.on('load', () => {
      const attributionControl = document.querySelector('.maplibregl-ctrl-attrib');
      if (attributionControl) {
        attributionControl.classList.add('attribution-hidden');
      }
      initializeMapLayers(mapInstance);
      applyStaticStyle(mapInstance);
      onAnyChange();
      mapInstance.on('moveend', onAnyChange);
    });
  } catch (error) {
    console.error('Error loading osm_globe.json:', error);
    alert('Could not load osm_globe.json. Make sure the file is in the same directory as this page.');
  }
}

function applyStaticStyle(map) {
  if (!map) return;
  applyHeatmapStaticProperties(map);
  applyVectorStaticProperties(map);
  setNightLightScales({
    heatmap: STYLE_PRESET.night.heatmapBrightness,
    detail: STYLE_PRESET.night.detailBrightness,
    layerScales: STYLE_PRESET.detailLayers,
  });
  const ensureRadiusListener = () => {
    const handler = () => applyHeatmapRadius(map);
    if (!map[radiusListenerKey]) {
      map[radiusListenerKey] = handler;
      map.on('moveend', handler);
    }
    handler();
  };
  ensureRadiusListener();
}

function updateSunEvents(date, lat, lon) {
  const times = SunCalc.getTimes(date, lat, lon);
  const sunriseInfo = buildSolarEventInfo(times.sunrise, lon);
  const sunsetInfo = buildSolarEventInfo(times.sunset, lon);
  updateTimeGradient(sunriseInfo.minutes, sunsetInfo.minutes);
}

function applyHeatmapStaticProperties(map) {
  Object.entries(STYLE_PRESET.heatmaps).forEach(([key, config]) => {
    const layerId = HEATMAP_LAYER_MAP[key];
    if (!layerId || !map.getLayer(layerId)) return;

    if (config.maxzoom !== undefined) {
      const layer = map.getLayer(layerId);
      const minzoom = layer?.minzoom ?? 0;
      map.setLayerZoomRange(layerId, minzoom, config.maxzoom);
    }

    if (config.intensity) {
      const expr = buildInterpolateExpression(config.intensity);
      if (expr) {
        map.setPaintProperty(layerId, 'heatmap-intensity', expr);
      }
    }

    if (config.weightClasses) {
      const baseExpr = buildWeightClassExpression(config.weightClasses);
      const scaleExpr = buildScaleExpression(config.weightStops);
      if (baseExpr !== null) {
        map.setPaintProperty(
          layerId,
          'heatmap-weight',
          scaleExpr ? ['*', baseExpr, scaleExpr] : baseExpr,
        );
      }
    }
  });
}

function applyHeatmapRadius(map) {
  const lat = map.getCenter().lat;
  Object.entries(STYLE_PRESET.heatmaps).forEach(([key, config]) => {
    const layerId = HEATMAP_LAYER_MAP[key];
    if (!layerId || !map.getLayer(layerId) || !config.radius) return;
    const expr = buildRadiusExpression(config.radius, lat);
    if (expr) {
      map.setPaintProperty(layerId, 'heatmap-radius', expr);
    }
  });
}

function applyVectorStaticProperties(map) {
  VECTOR_FAMILIES.forEach((family) => {
    const stopsObj = STYLE_PRESET.vectors[family.id];
    if (!stopsObj) return;
    const stopsArray = buildStopsArray(stopsObj);
    if (!stopsArray.length) return;
    family.derived.forEach(({ layerId, factor }) => {
      if (!map.getLayer(layerId)) return;
      const expr = buildScaledStopsExpression(stopsArray, factor);
      if (expr) {
        map.setPaintProperty(layerId, 'line-width', expr);
      }
    });
  });
}

function buildInterpolateExpression(stopsObj) {
  if (!stopsObj) return null;
  const stops = buildStopsArray(stopsObj);
  if (!stops.length) return null;
  if (stops.length === 1) return stops[0][1];
  const flattened = [];
  stops.forEach(([zoom, value]) => {
    flattened.push(zoom, value);
  });
  return ['interpolate', ['linear'], ['zoom'], ...flattened];
}

function buildScaledStopsExpression(stopsArray, factor) {
  if (!stopsArray.length) return null;
  if (stopsArray.length === 1) {
    return stopsArray[0][1] * factor;
  }
  const flattened = [];
  stopsArray.forEach(([zoom, value]) => {
    flattened.push(zoom, value * factor);
  });
  return ['interpolate', ['linear'], ['zoom'], ...flattened];
}

function buildScaleExpression(stopsObj) {
  if (!stopsObj) return null;
  const stops = buildStopsArray(stopsObj);
  if (!stops.length) return null;
  const allOnes = stops.every(([, value]) => Math.abs(value - 1) < 1e-6);
  if (allOnes) return null;
  return buildInterpolateExpression(stopsObj);
}

function buildWeightClassExpression(classes = {}) {
  const classKeys = Object.keys(classes).filter(
    (key) => key !== '__default' && key !== '__base',
  );
  if (!classKeys.length) {
    if (classes.__base !== undefined) return classes.__base;
    if (classes.__default !== undefined) return classes.__default;
    return 1;
  }
  const expr = ['match', ['get', 'class']];
  classKeys.forEach((key) => {
    expr.push(key, classes[key]);
  });
  expr.push(classes.__default ?? 1);
  return expr;
}

function buildRadiusExpression(radiusStops, lat) {
  const stops = buildStopsArray(radiusStops);
  if (!stops.length) return null;
  const flattened = [];
  stops.forEach(([zoom, meters]) => {
    flattened.push(zoom, metersToPixels(meters, zoom, lat));
  });
  if (flattened.length === 2) {
    return flattened[1];
  }
  return ['interpolate', ['linear'], ['zoom'], ...flattened];
}

function buildStopsArray(stopsObj) {
  if (!stopsObj) return [];
  const entries = Object.keys(stopsObj)
    .map((key) => [Number(key), stopsObj[key]])
    .filter((entry) => Number.isFinite(entry[0]) && Number.isFinite(entry[1]))
    .sort((a, b) => a[0] - b[0]);
  if (!entries.length) {
    console.warn('No valid stops provided for expression:', stopsObj);
  }
  return entries;
}

function metersPerPixel(zoom, lat) {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  return (
    (Math.cos((clampedLat * Math.PI) / 180) * EARTH_CIRCUMFERENCE) / Math.pow(2, zoom + 8)
  );
}

function metersToPixels(meters, zoom, lat) {
  const mpp = metersPerPixel(zoom, lat);
  return meters / (mpp || 1);
}

function buildSolarEventInfo(date, lon) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { label: '--:--', minutes: null };
  }
  const adjusted = toLocalSolarDate(date, lon);
  return {
    label: fmtTime(adjusted),
    minutes: minutesOfDayFromDate(adjusted),
  };
}

function toLocalSolarDate(date, lon) {
  const utcMillis = date.getTime() + date.getTimezoneOffset() * 60000;
  const lonOffsetMinutes = (lon / 15) * 60;
  return new Date(utcMillis + lonOffsetMinutes * 60000);
}

function updateTimeGradient(sunriseMinutes, sunsetMinutes) {
  if (!timeGradient) return;
  if (!Number.isFinite(sunriseMinutes) || !Number.isFinite(sunsetMinutes)) {
    timeGradient.style.background = '#d9d9d9';
    return;
  }

  let sunrisePct = (sunriseMinutes / (MINUTES_PER_DAY - 1)) * 100;
  let sunsetPct = (sunsetMinutes / (MINUTES_PER_DAY - 1)) * 100;

  if (sunsetPct <= sunrisePct) {
    timeGradient.style.background = '#6fb7ff';
    return;
  }

  const nightColor = '#050b2c';
  const deepTwilight = '#17214d';
  const warmGlow = '#ffb36a';
  const softGlow = '#ffe3ba';
  const dayColor = '#9dd8ff';

  const dawnLead = Math.max(0, sunrisePct - 6);
  const dawnWarm = Math.max(0, sunrisePct - 2.5);
  const dawnPeak = sunrisePct;
  const dawnFade = Math.min(100, sunrisePct + 3);

  const duskStart = Math.max(0, sunsetPct - 3);
  const duskPeak = sunsetPct;
  const duskTrail = Math.min(100, sunsetPct + 6);

  const gradient = `linear-gradient(90deg,
    ${nightColor} 0%,
    ${nightColor} ${dawnLead}%,
    ${deepTwilight} ${dawnLead}%,
    ${warmGlow} ${dawnWarm}%,
    ${softGlow} ${dawnPeak}%,
    ${dayColor} ${dawnFade}%,
    ${dayColor} ${duskStart}%,
    ${softGlow} ${duskStart}%,
    ${warmGlow} ${duskPeak}%,
    ${deepTwilight} ${duskTrail}%,
    ${nightColor} ${duskTrail}%,
    ${nightColor} 100%
  )`;

  timeGradient.style.background = gradient;
}

initControls();
initMap();
