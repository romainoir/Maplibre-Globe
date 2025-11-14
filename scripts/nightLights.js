const HEATMAP_LAYERS = [
  'urban-heatmap-residential',
  'urban-heatmap-roads',
  'urban-heatmap-buildings',
];

const DETAIL_LAYERS = [
  'night-residential-glow-outer',
  'night-residential-glow',
  'night-residential-core',
  'night-motorways-glow-outer',
  'night-motorways-glow',
  'night-motorways-core',
  'night-roads-glow-outer',
  'night-roads-glow',
  'night-roads-core',
];

const HEATMAP_OPACITY_STOPS = [
  [0, 0.9],
  [3, 0.9],
  [6, 0.6],
  [8, 0.3],
  [10, 0.0],
];

const DETAIL_OPACITY_STOPS = [
  [7, 0.0],
  [9, 0.3],
  [12, 0.8],
  [15, 0.95],
];

const clamp01 = (value) => Math.max(0, Math.min(1, value));

let heatmapScale = 1;
let detailScale = 1;
const layerDetailOverrides = DETAIL_LAYERS.reduce((acc, id) => {
  acc[id] = 1;
  return acc;
}, {});
let lastMapInstance = null;
let lastLightIntensity = null;

function buildZoomExpression(stops, scale = 1) {
  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    ...stops.flatMap(([zoom, value]) => [zoom, value * scale]),
  ];
}

function coreFactorForLayer(layerId) {
  if (layerId.includes('outer')) return 0.2;
  if (layerId.includes('glow')) return 0.45;
  return 0.75;
}

function applyNightLights(map, lightIntensity) {
  const nightFactor = clamp01(1.3 - lightIntensity * 2.5);
  const scaledHeatmap = clamp01(nightFactor * heatmapScale);
  const scaledDetail = clamp01(nightFactor * detailScale);

  HEATMAP_LAYERS.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    map.setPaintProperty(
      layerId,
      'heatmap-opacity',
      buildZoomExpression(HEATMAP_OPACITY_STOPS, scaledHeatmap),
    );
  });

  DETAIL_LAYERS.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    const isFill = layerId.includes('residential');
    const propName = isFill ? 'fill-opacity' : 'line-opacity';
    const layerScale = scaledDetail * coreFactorForLayer(layerId) * (layerDetailOverrides[layerId] ?? 1);

    map.setPaintProperty(
      layerId,
      propName,
      buildZoomExpression(DETAIL_OPACITY_STOPS, layerScale),
    );
  });
}

export function updateNightLights(map, lightIntensity) {
  if (!map) return;
  lastMapInstance = map;
  lastLightIntensity = lightIntensity;
  applyNightLights(map, lightIntensity);
}

export function setNightLightScales({ heatmap, detail, layerScales } = {}) {
  if (typeof heatmap === 'number') {
    heatmapScale = Math.max(0, heatmap);
  }
  if (typeof detail === 'number') {
    detailScale = Math.max(0, detail);
  }
  if (layerScales) {
    Object.entries(layerScales).forEach(([layerId, value]) => {
      if (layerDetailOverrides[layerId] !== undefined) {
        layerDetailOverrides[layerId] = Math.max(0, value);
      }
    });
  }

  if (lastMapInstance && lastLightIntensity !== null) {
    applyNightLights(lastMapInstance, lastLightIntensity);
  }
}
