import STYLE_PRESET from './stylePreset.js';

export function initializeMapLayers(map) {
  if (!map) return;

  map.addLayer({
    id: 'urban-heatmap-residential',
    type: 'heatmap',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['in', 'class', 'residential', 'commercial', 'industrial'],
    maxzoom: STYLE_PRESET.heatmaps.residential.maxzoom ?? 15,
    paint: {
      'heatmap-weight': buildWeightExpression(STYLE_PRESET.heatmaps.residential.weightClasses, 0.7),
      'heatmap-intensity': buildStopsExpression(
        STYLE_PRESET.heatmaps.residential.intensity,
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.35,
          3,
          0.6,
          6,
          0.9,
          9,
          1.1,
        ],
      ),
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0.0,
        'rgba(0, 0, 0, 0)',
        0.15,
        'rgba(255, 200, 120, 0.15)',
        0.35,
        'rgba(255, 190, 100, 0.40)',
        0.6,
        'rgba(255, 180, 80, 0.75)',
        0.85,
        'rgba(255, 220, 170, 0.95)',
        1.0,
        'rgba(255, 250, 220, 1.0)',
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        2,
        2,
        6,
        4,
        14,
        6,
        24,
        8,
        32,
      ],
      'heatmap-opacity': 0,
    },
  });

  map.addLayer({
    id: 'urban-heatmap-roads',
    type: 'heatmap',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'motorway', 'trunk', 'primary', 'secondary'],
    maxzoom: STYLE_PRESET.heatmaps.roads.maxzoom ?? 15,
    paint: {
      'heatmap-weight': buildWeightExpression(STYLE_PRESET.heatmaps.roads.weightClasses, [
        'match',
        ['get', 'class'],
        'motorway',
        1.4,
        'trunk',
        1.2,
        'primary',
        1.0,
        'secondary',
        0.8,
        0.5,
      ]),
      'heatmap-intensity': buildStopsExpression(
        STYLE_PRESET.heatmaps.roads.intensity,
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.4,
          3,
          0.7,
          6,
          1.0,
          9,
          1.1,
        ],
      ),
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0.0,
        'rgba(0, 0, 0, 0)',
        0.15,
        'rgba(255, 190, 110, 0.15)',
        0.35,
        'rgba(255, 175, 90, 0.40)',
        0.6,
        'rgba(255, 155, 70, 0.75)',
        0.85,
        'rgba(255, 135, 50, 0.95)',
        1.0,
        'rgba(255, 210, 160, 1.0)',
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        1,
        2,
        4,
        4,
        10,
        6,
        16,
        8,
        20,
      ],
      'heatmap-opacity': 0,
    },
  });

  map.addLayer({
    id: 'urban-heatmap-buildings',
    type: 'heatmap',
    source: 'openmaptiles',
    'source-layer': 'building',
    maxzoom: STYLE_PRESET.heatmaps.buildings.maxzoom ?? 15,
    paint: {
      'heatmap-weight': buildWeightExpression(STYLE_PRESET.heatmaps.buildings.weightClasses, 0.9),
      'heatmap-intensity': buildStopsExpression(
        STYLE_PRESET.heatmaps.buildings.intensity,
        [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.2,
          5,
          0.7,
          9,
          1.4,
        ],
      ),
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0.0,
        'rgba(0, 0, 0, 0)',
        0.2,
        'rgba(255, 225, 160, 0.25)',
        0.4,
        'rgba(255, 210, 130, 0.5)',
        0.7,
        'rgba(255, 200, 110, 0.8)',
        0.9,
        'rgba(255, 240, 210, 0.95)',
        1.0,
        'rgba(255, 255, 240, 1.0)',
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        0.6,
        5,
        4,
        9,
        12,
      ],
      'heatmap-opacity': 0,
    },
  });

  map.addLayer({
    id: 'night-residential-glow-outer',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['==', 'class', 'residential'],
    minzoom: 9,
    paint: {
      'fill-color': '#CC8A3A',
      'fill-opacity': 0,
      'fill-antialias': true,
    },
  });

  map.addLayer({
    id: 'night-residential-glow',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['==', 'class', 'residential'],
    minzoom: 9,
    paint: {
      'fill-color': '#FFC766',
      'fill-opacity': 0,
      'fill-antialias': true,
    },
  });

  map.addLayer({
    id: 'night-residential-core',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['==', 'class', 'residential'],
    minzoom: 9,
    paint: {
      'fill-color': '#FFEED6',
      'fill-opacity': 0,
      'fill-antialias': true,
    },
  });

  map.addLayer({
    id: 'night-motorways-glow-outer',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'motorway', 'trunk'],
    minzoom: 7,
    paint: {
      'line-color': '#FF8A33',
      'line-width': [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        7,
        4,
        12,
        16,
        16,
        32,
      ],
      'line-blur': 4,
      'line-opacity': 0,
    },
  });

  map.addLayer({
    id: 'night-motorways-glow',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'motorway', 'trunk'],
    minzoom: 7,
    paint: {
      'line-color': '#FFC857',
      'line-width': [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        7,
        3,
        12,
        12,
        16,
        24,
      ],
      'line-blur': 2,
      'line-opacity': 0,
    },
  });

  map.addLayer({
    id: 'night-motorways-core',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'motorway', 'trunk'],
    minzoom: 7,
    paint: {
      'line-color': '#FFF7E0',
      'line-width': [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        7,
        1.5,
        12,
        6,
        16,
        12,
      ],
      'line-blur': 0.5,
      'line-opacity': 0,
    },
  });

  map.addLayer({
    id: 'night-roads-glow-outer',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
    minzoom: 8,
    paint: {
      'line-color': '#FFB04D',
      'line-width': [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        8,
        3,
        12,
        8,
        16,
        20,
      ],
      'line-blur': 3,
      'line-opacity': 0,
    },
  });

  map.addLayer({
    id: 'night-roads-glow',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
    minzoom: 8,
    paint: {
      'line-color': '#FFD873',
      'line-width': [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        8,
        2,
        12,
        5,
        16,
        14,
      ],
      'line-blur': 1.5,
      'line-opacity': 0,
    },
  });

  map.addLayer({
    id: 'night-roads-core',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    filter: ['in', 'class', 'primary', 'secondary', 'tertiary'],
    minzoom: 8,
    paint: {
      'line-color': '#FFF7EB',
      'line-width': [
        'interpolate',
        ['exponential', 1.5],
        ['zoom'],
        8,
        1,
        12,
        2.5,
        16,
        8,
      ],
      'line-blur': 0.3,
      'line-opacity': 0,
    },
  });

  map.addSource('sun-marker', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'sun-position',
    type: 'circle',
    source: 'sun-marker',
    paint: {
      'circle-radius': 20,
      'circle-color': '#FFD700',
      'circle-opacity': 0.8,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFA500',
      'circle-stroke-opacity': 0.9,
    },
  });

  map.addSource('moon-marker', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });

  map.addLayer({
    id: 'moon-position',
    type: 'circle',
    source: 'moon-marker',
    paint: {
      'circle-radius': 15,
      'circle-color': '#E6E6FA',
      'circle-opacity': 0.8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#B0C4DE',
      'circle-stroke-opacity': 0.9,
    },
  });

  console.log('Urban heatmaps and night vectors ready.');
}

function buildStopsExpression(stopsObj, fallback) {
  if (!stopsObj) return fallback;
  const entries = Object.keys(stopsObj)
    .map((key) => [Number(key), stopsObj[key]])
    .filter((entry) => Number.isFinite(entry[0]) && Number.isFinite(entry[1]))
    .sort((a, b) => a[0] - b[0]);
  if (!entries.length) return fallback;
  if (entries.length === 1) return entries[0][1];
  const flattened = [];
  entries.forEach(([zoom, value]) => flattened.push(zoom, value));
  return ['interpolate', ['linear'], ['zoom'], ...flattened];
}

function buildWeightExpression(classes, fallback) {
  if (!classes) return fallback;
  const classKeys = Object.keys(classes).filter(
    (key) => key !== '__default' && key !== '__base',
  );
  if (!classKeys.length) {
    if (classes.__base !== undefined) return classes.__base;
    return fallback;
  }
  const expr = ['match', ['get', 'class']];
  classKeys.forEach((key) => {
    expr.push(key, classes[key]);
  });
  expr.push(classes.__default ?? fallback ?? 1);
  return expr;
}
