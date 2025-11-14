const STYLE_PRESET = {
  heatmaps: {
    residential: {
      maxzoom: 15,
      radius: { 2: 50, 8: 3100, 15: 50 },
      intensity: { 2: 0.05, 8: 0.2, 15: 0.05 },
      weightStops: { 0: 1, 15: 1 },
      weightClasses: { __base: 0.7 },
    },
    roads: {
      maxzoom: 15,
      radius: { 2: 11950, 8: 2350, 15: 50 },
      intensity: { 2: 0.15, 8: 0.2, 15: 0.2 },
      weightStops: { 0: 1, 15: 1 },
      weightClasses: {
        motorway: 1.4,
        trunk: 1.2,
        primary: 1,
        secondary: 0.8,
        __default: 0.5,
      },
    },
    buildings: {
      maxzoom: 15,
      radius: { 2: 3900, 8: 2750, 15: 1600 },
      intensity: { 2: 0.35, 8: 0.4, 15: 0.4 },
      weightStops: { 0: 1, 15: 1 },
      weightClasses: { __base: 0.9 },
    },
  },
  vectors: {
    motorways: { 2: 1.2, 8: 1.95, 15: 5.3 },
    roads: { 2: 0.2, 8: 1.85, 15: 2.85 },
  },
  detailLayers: {
    'night-residential-glow-outer': 1.3,
    'night-residential-glow': 0.75,
    'night-residential-core': 0.5,
  },
  night: {
    heatmapBrightness: 1,
    detailBrightness: 1,
  },
};

export default STYLE_PRESET;
