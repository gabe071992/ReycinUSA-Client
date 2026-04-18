# Fix R+ 3D Track Viewer — Canvas Rendering


## Root Cause
The 3D canvas is initialized with zero dimensions because the WebView reports `innerWidth/Height = 0` at script startup on Android. Every track point collapses to a single dot at the origin (the "zoomed in" effect), drawn on a 0×0 canvas (the "blank" effect). The park name and racing line toggles still appear because those are HTML elements, not canvas-drawn — confirming the data pipeline works perfectly.

## What Gets Fixed

**Canvas initialization**
- Replace the instant `window.innerWidth/Height` capture with a deferred resize using `requestAnimationFrame` + `setTimeout` chained together, forcing a re-measure after the native layout settles
- Add a per-frame canvas size guard: on every draw, if `W` or `H` is 0 or mismatches the actual viewport, re-measure and resize before drawing anything — this self-heals across all Android timing variations
- Add explicit `width:100vw; height:100vh` CSS to the canvas as a visual fallback while the pixel buffer is being established

**Device pixel ratio**
- Apply `devicePixelRatio` scaling to the canvas pixel buffer (CSS size stays the same, buffer is 2× or 3× larger) — fixes blurry rendering on all high-DPI Android devices and makes edges crisp

**Camera auto-fit after data loads**
- After `buildScene()` runs, compute the bounding box of all track segment coordinates
- Set the camera target to the track centroid and compute an `r` (zoom distance) that frames the entire track with padding — so any track, regardless of position or scale in the 295×295 grid, always fills the viewport correctly on first load
- The user can still pinch/drag freely after auto-fit

**Resize handler hardening**
- Wire the resize to `visualViewport` change as well as `window resize`, covering Android's split-screen and orientation change cases
- Force an immediate re-draw after any resize

**Handshake reliability**
- Keep the existing `WEBVIEW_READY` → `SCENE_READY` message chain and fallback timers unchanged (they work)
