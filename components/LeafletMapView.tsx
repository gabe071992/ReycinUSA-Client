import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import WebView from "react-native-webview";

interface Coord {
  latitude: number;
  longitude: number;
}

export interface LeafletMapHandle {
  update: (coords: Coord[], marker?: Coord) => void;
}

interface LeafletMapViewProps {
  center: Coord;
  zoom?: number;
  coordinates?: Coord[];
  markerCoordinate?: Coord;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

function buildHTML(
  center: Coord,
  zoom: number,
  coordinates: Coord[],
  markerCoordinate: Coord | undefined,
  interactive: boolean
): string {
  const coordsJSON = JSON.stringify(coordinates);
  const markerJSON = JSON.stringify(markerCoordinate ?? null);

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
#map { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var dragging = ${interactive ? "true" : "false"};
var map = L.map('map', {
  zoomControl: false,
  attributionControl: false,
  dragging: dragging,
  touchZoom: dragging,
  scrollWheelZoom: dragging,
  doubleClickZoom: dragging,
  boxZoom: dragging,
  keyboard: dragging,
});

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19
}).addTo(map);

map.setView([${center.latitude}, ${center.longitude}], ${zoom});

var polyline = null;
var liveMarker = null;

function renderCoords(coords, marker) {
  if (polyline) { map.removeLayer(polyline); polyline = null; }
  if (liveMarker) { map.removeLayer(liveMarker); liveMarker = null; }

  if (coords && coords.length > 1) {
    var latlngs = coords.map(function(c) { return [c.latitude, c.longitude]; });
    polyline = L.polyline(latlngs, { color: '#FF1801', weight: 3, opacity: 1 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [20, 20], animate: false });
  }

  if (marker) {
    liveMarker = L.circleMarker([marker.latitude, marker.longitude], {
      radius: 7,
      fillColor: '#FF1801',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1,
      opacity: 1
    }).addTo(map);
    if (!coords || coords.length <= 1) {
      map.setView([marker.latitude, marker.longitude], map.getZoom(), { animate: false });
    }
  }
}

renderCoords(${coordsJSON}, ${markerJSON});

function handleMessage(data) {
  try {
    var msg = JSON.parse(data);
    if (msg.type === 'update') {
      renderCoords(msg.coords, msg.marker);
    }
  } catch(e) {}
}

if (window.ReactNativeWebView) {
  document.addEventListener('message', function(e) { handleMessage(e.data); });
} else {
  window.addEventListener('message', function(e) { handleMessage(e.data); });
}
</script>
</body>
</html>`;
}

const LeafletMapView = forwardRef<LeafletMapHandle, LeafletMapViewProps>(
  (
    {
      center,
      zoom = 14,
      coordinates = [],
      markerCoordinate,
      interactive = true,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      update: (coords: Coord[], marker?: Coord) => {
        const payload = JSON.stringify({ type: "update", coords, marker: marker ?? null });
        const js = `handleMessage(${JSON.stringify(payload)}); true;`;
        webViewRef.current?.injectJavaScript(js);
      },
    }));

    const html = buildHTML(center, zoom, coordinates, markerCoordinate, interactive);

    return (
      <View style={[{ overflow: "hidden" }, style]}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={{ flex: 1, backgroundColor: "#000" }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    );
  }
);

export default LeafletMapView;
