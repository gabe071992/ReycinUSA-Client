# R+ Tab — Technical Reference

## Overview

R+ is the third subtab inside the **Tracks** segment of the **Race** tab. It renders curated motorsport facilities (parks) in a custom software-rendered 3D viewport using a `<canvas>` element inside a React Native `WebView`. No Three.js or WebGL dependency — the renderer is a pure 2D canvas isometric projection written in vanilla JavaScript and embedded as a static HTML string.

---

## File Paths

| Role | Path |
|---|---|
| R+ screen component | `expo/components/RPlusScreen.tsx` |
| Race tab (host) | `expo/app/(tabs)/race/index.tsx` |
| Firebase config (main) | `expo/config/firebase.ts` |
| Tracks provider | `expo/providers/TracksProvider.tsx` |

---

## Where R+ Is Mounted

`TracksScreen` inside `expo/app/(tabs)/race/index.tsx` owns the three-way subtab segment (`LIBRARY` / `MY TRACKS` / `R+`). When `listMode === "rplus"`, it renders:

```tsx
{listMode === "rplus" && (
  <RPlusScreen />
)}
```

The tab switcher lives in `tracksStyles.segmentBar` and is part of the `TracksScreen` component, not `RPlusScreen`. `RPlusScreen` receives no props and manages all its own state.

---

## Coordinate System

The lot is a **295 ft × 295 ft** grid. The origin `(0,0)` is the top-left corner as seen from above.

```
(0,0) ─────────────────── (295,0)
  |                            |
  |    LOT (295 ft × 295 ft)   |
  |         ~2 acres           |
  |                            |
(0,295) ──────────────── (295,295)
```

### 2D → 3D Conversion (`toW` function in WebView JS)

| Firebase field | Three.js / world axis | Formula |
|---|---|---|
| `x` | world X | `x - 147.5` (centred) |
| `y` | world Z | `y - 147.5` (centred) |
| `elevation` | world Y (up) | used as-is |

---

## Firebase Data Paths

All data lives under: `reycinUSA/works/pm/`

| Entity | Firebase path |
|---|---|
| Parks | `reycinUSA/works/pm/parks/{parkId}` |
| Park Items (facilities) | `reycinUSA/works/pm/parkItems/{itemId}` |
| Track Segments | `reycinUSA/works/pm/trackSegments/{segId}` |
| Racing Lines | `reycinUSA/works/pm/racingLines/{lineId}` |

### Park schema

```json
{
  "id": "-OprbLEoQKpk4xUjX0q8",
  "name": "rtc",
  "description": "rtc",
  "lotWidthFt": 295,
  "lotHeightFt": 295,
  "createdAt": 1775828296618,
  "updatedAt": 1775828296618
}
```

### Track Segment schema

```json
{
  "id": "-OoVnKGmkb_BvKIYuejf",
  "parkId": "-OoVmUr2HKWW8Ld-rWjF",
  "segmentType": "straight",
  "startX": 21.28, "startY": 21.07,
  "endX": 213.03, "endY": 21.07,
  "controlX": 117.15, "controlY": 21.07,
  "trackWidth": 8,
  "elevation": 0, "elevationEnd": 0,
  "turnDegrees": 0, "turnName": "IDK",
  "notes": ""
}
```

`segmentType` is `"straight"` or `"curve"`. Curves require `controlX` / `controlY` (quadratic Bézier control point). Straights ignore the control point.

### Park Item schema

```json
{
  "id": "-OqHB0hTKsw0tNHN5v33",
  "parkId": "-OqFb_dt0XcT25fwFTVn",
  "type": "spectator-area",
  "label": "Spectator Area",
  "icon": "👥",
  "x": 49.07, "y": 155.99,
  "width": 30, "height": 20,
  "rotation": 0,
  "color": "hsl(var(--muted-foreground))",
  "notes": ""
}
```

### Racing Line schema

```json
{
  "id": "-Ops9ZX2jgbs--szAE1E",
  "parkId": "-OprbLEoQKpk4xUjX0q8",
  "name": "Robinson",
  "driverName": "Robinson",
  "vehicleInfo": "328xi",
  "color": "hsl(330, 80%, 55%)",
  "sessionType": "practice",
  "visible": true,
  "closed": false,
  "points": [
    { "x": 80.70, "y": 23.39 },
    { "x": 29.29, "y": 27.60 }
  ],
  "createdAt": 1775837530095,
  "updatedAt": 1775844437090,
  "version": 1
}
```

---

## Facility Item Types (18 predefined)

| `type` key | Label | Default size (ft) |
|---|---|---|
| `paddock` | Paddock | 40 × 25 |
| `start-finish` | Start / Finish | 20 × 8 |
| `marshall-post` | Marshall Post | 8 × 8 |
| `emergency-unit` | Emergency Unit | 12 × 10 |
| `medical-center` | Medical Center | 20 × 15 |
| `pit-lane` | Pit Lane | 35 × 10 |
| `spectator-area` | Spectator Area | 30 × 20 |
| `timing-tower` | Timing Tower | 10 × 10 |
| `fuel-station` | Fuel Station | 12 × 12 |
| `tech-inspection` | Tech Inspection | 15 × 12 |
| `entrance-gate` | Entrance Gate | 10 × 6 |
| `parking-lot` | Parking Lot | 35 × 25 |
| `restroom` | Restroom | 8 × 8 |
| `control-room` | Control Room | 12 × 10 |
| `barrier-wall` | Barrier / Wall | 20 × 3 |
| `tire-wall` | Tire Wall | 15 × 4 |
| `gravel-trap` | Gravel Trap | 20 × 12 |
| `custom-item` | Custom Item | 10 × 10 |

---

## 3D Viewer Architecture

### Renderer

Pure software render using the browser `<canvas>` 2D API. No WebGL, no Three.js. Uses a custom perspective projection matrix computed every frame via `computeView()`.

### Projection pipeline

```
Firebase (x, y, elevation)
  └─ toW(x, y, e) → world [x−147.5, e, y−147.5]
       └─ project(wx, wy, wz) → screen [px, py, depth]
            └─ canvas 2D draw calls
```

The camera is a spherical orbit model:

| Parameter | Default | Description |
|---|---|---|
| `cam.theta` | `0.6` | Azimuth (radians) |
| `cam.phi` | `1.0` | Elevation angle (radians) |
| `cam.r` | `260` | Orbit radius |
| `cam.tx/ty/tz` | `0` | Pan offset |

### WebView message protocol

All messages use `JSON.stringify` / `JSON.parse`.

**WebView → React Native:**

| `type` | When | Description |
|---|---|---|
| `WEBVIEW_READY` | On script init | Bridge handshake — confirms JS is live |
| `SCENE_READY` | After `buildScene()` completes | Signals loading overlay can be dismissed |

**React Native → WebView:**

| `type` | Payload | Description |
|---|---|---|
| `TRACK_DATA` | `{ parkName, segments, items, racingLines }` | Full dataset to render |
| `RESET_CAM` | none | Resets camera to default orbit |

### Loading state machine

```
parksQuery loads
  └─ no parks → sceneReady = true immediately
  └─ parks exist → auto-select first park
       └─ trackDataQuery loads for selectedParkId
            └─ webviewReady = true (WEBVIEW_READY handshake or 3s fallback)
                 └─ sendTrackData() → postMessage TRACK_DATA
                      └─ SCENE_READY from WebView → sceneReady = true
                      └─ fallback timeout 2s → sceneReady = true
```

`isDataLoading = parksQuery.isLoading || trackDataQuery.isLoading || !sceneReady`

The loading overlay shows the label:
- `"LOADING PARKS"` while parksQuery is pending
- `"LOADING TRACK DATA"` while trackDataQuery is pending
- `"BUILDING SCENE"` while `!sceneReady` (WebView is rendering)

### Touch controls (inside WebView)

| Gesture | Action |
|---|---|
| 1-finger drag | Orbit (theta / phi) |
| 2-finger pinch | Zoom (cam.r) |
| 2-finger drag | Pan (cam.tx / cam.tz) |

### Racing line legend

Rendered as toggleable pills in `#ui` div at the bottom of the WebView. Each pill shows driver name + vehicle. Tap toggles `rl.visible`. Lines respect elevation (`y = 0.35` ft above grade so they render above the track surface).

---

## React Native Component State

```typescript
webviewReady:   boolean   // true after WEBVIEW_READY received (or 3s fallback)
sceneReady:     boolean   // true after SCENE_READY received (or 2s fallback)
selectedParkId: string | null  // currently displayed park
```

Refs:
- `webviewRef` — imperative handle to send `postMessage`
- `sceneReadyRef` — non-re-render copy of sceneReady used inside timeout callbacks
- `sceneTimeoutRef` — holds the 2s fallback timer handle

---

## Web Platform

On `Platform.OS === "web"` the component renders a static placeholder instead of the WebView. The 3D canvas is only available on native (iOS / Android).
