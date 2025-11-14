# Night Lights Globe

This project renders a MapLibre globe with a custom "urban heat" visualization that blends raster heatmaps, vector glow layers, and dynamic night lighting. A frosted-glass control panel lets you scrub through the day of year and local time, with a sunrise/sunset-aware gradient baked right into the time slider. SunCalc-derived celestial data drives the lighting, day/night terminator, and info badges.

## Features
- **Globe + terrain** based on MapLibre GL JS with contour shading from `maplibre-contour` and OpenMapTiles data described in `styles/osm_globe.json`.
- **Urban density heatmaps** for residential/commercial landuse, roads, and buildings, tuned through `scripts/stylePreset.js` and `scripts/nightLights.js`.
- **Vector glow layers** (motorways + arterial roads) that fade in with zoom and adjust brightness at night.
- **Daylight controls** with a day-of-year slider, a sunrise/sunset-coded time slider, and real-time sunrise/sunset readouts.
- **Celestial overlay** showing sun/moon positions and phases using SunCalc and custom `scripts/celestial.js` helpers.

## File layout
```
index.html             # Entry point that wires the map + control panel
styles/
  globe.css            # Frosted glass UI + layout styles
  osm_globe.json       # Base MapLibre style (OpenMapTiles derived)
scripts/
  main.js              # App bootstrap: loads style, wires controls, and hooks layers
  mapLayers.js         # Adds heatmap/vector layers + markers
  nightLights.js       # Handles night light opacity logic
  lighting.js          # Applies SunCalc-based globe lighting
  celestial.js         # Sun/moon info + markers
  stylePreset.js       # Stores tuned heatmap/vector presets
  skyPresets.js, timeUtils.js, etc.
```

## Running locally
1. Serve the folder over HTTP (MapLibre requires it). For example:
   ```bash
   # Windows PowerShell
   python -m http.server 8005
   ```
   or `npx serve .` if you have Node installed.
2. Open `http://localhost:8005/index.html` in a modern browser.
3. Use the sliders to scrub through daylight/times and observe the night lighting, celestial markers, and heatmap vectors updating in real time.

## Customization hints
- Edit `scripts/stylePreset.js` to tweak radii, intensity, weight stops, or vector widths; those propagate through layer setup and runtime.
- See `scripts/nightLights.js` for opacity curves and the physics behind nightFactor.
- `scripts/celestial.js` exposes helpers if you want to add more celestial UI.

Enjoy exploring global infrastructure glow!
