import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, Text, StyleProp, ViewStyle, Platform } from "react-native";
import { MapPin } from "lucide-react-native";

interface Coord {
  latitude: number;
  longitude: number;
}

export interface LeafletMapHandle {
  update: (coords: Coord[], marker?: Coord) => void;
  locateUser: () => void;
  panTo: (coord: Coord) => void;
}

interface LeafletMapViewProps {
  center: Coord;
  zoom?: number;
  coordinates?: Coord[];
  markerCoordinate?: Coord;
  interactive?: boolean;
  followMode?: boolean;
  showUserLocation?: boolean;
  onTap?: (coord: Coord) => void;
  style?: StyleProp<ViewStyle>;
}

function buildHTML(
  center: Coord,
  zoom: number,
  coordinates: Coord[],
  markerCoordinate: Coord | undefined,
  interactive: boolean,
  followMode: boolean,
  showUserLocation: boolean
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
.user-location-ring {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: rgba(0, 122, 255, 0.18);
  border: 2px solid rgba(0, 122, 255, 0.6);
  animation: pulse 1.8s infinite;
}
.user-location-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #007AFF;
  border: 2px solid #fff;
  box-shadow: 0 0 6px rgba(0,122,255,0.8);
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}
</style>
</head>
<body>
<div id="map"></div>
<script>
var dragging = ${interactive ? "true" : "false"};
var followMode = ${followMode ? "true" : "false"};
var showUserLocation = ${showUserLocation ? "true" : "false"};

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
var userLocationMarker = null;
var userLat = null;
var userLng = null;
var watchId = null;

function postToRN(data) {
  var json = JSON.stringify(data);
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(json);
  } else {
    window.parent.postMessage(json, '*');
  }
}

function renderCoords(coords, marker) {
  if (polyline) { map.removeLayer(polyline); polyline = null; }
  if (liveMarker) { map.removeLayer(liveMarker); liveMarker = null; }

  if (coords && coords.length > 1) {
    var latlngs = coords.map(function(c) { return [c.latitude, c.longitude]; });
    polyline = L.polyline(latlngs, { color: '#FF1801', weight: 3, opacity: 1 }).addTo(map);
    if (!followMode) {
      map.fitBounds(polyline.getBounds(), { padding: [20, 20], animate: false });
    }
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

    if (followMode) {
      map.panTo([marker.latitude, marker.longitude], { animate: true, duration: 0.5 });
    } else if (!coords || coords.length <= 1) {
      map.setView([marker.latitude, marker.longitude], map.getZoom(), { animate: false });
    }
  }
}

function updateUserLocation(lat, lng) {
  userLat = lat;
  userLng = lng;
  if (!showUserLocation) return;

  if (userLocationMarker) {
    userLocationMarker.setLatLng([lat, lng]);
  } else {
    var ringEl = document.createElement('div');
    ringEl.style.position = 'relative';
    ringEl.style.width = '20px';
    ringEl.style.height = '20px';

    var ring = document.createElement('div');
    ring.className = 'user-location-ring';
    ringEl.appendChild(ring);

    var dot = document.createElement('div');
    dot.className = 'user-location-dot';
    ringEl.appendChild(dot);

    var icon = L.divIcon({
      html: ringEl.outerHTML,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    userLocationMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 1000 }).addTo(map);
  }
}

function startUserLocation() {
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(
    function(pos) {
      updateUserLocation(pos.coords.latitude, pos.coords.longitude);
      postToRN({ type: 'user_location', lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    function(err) {
      console.warn('Geolocation error:', err.message);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2000 }
  );
}

function locateUser() {
  if (userLat !== null && userLng !== null) {
    map.flyTo([userLat, userLng], 16, { animate: true, duration: 0.8 });
  } else if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        updateUserLocation(pos.coords.latitude, pos.coords.longitude);
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { animate: true, duration: 0.8 });
      },
      function(err) { console.warn('Locate error:', err.message); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
}

renderCoords(${coordsJSON}, ${markerJSON});

if (showUserLocation) {
  startUserLocation();
}

map.on('click', function(e) {
  postToRN({ type: 'tap', lat: e.latlng.lat, lng: e.latlng.lng });
});

function handleMessage(data) {
  try {
    var msg = JSON.parse(data);
    if (msg.type === 'update') {
      renderCoords(msg.coords, msg.marker);
    } else if (msg.type === 'locateUser') {
      locateUser();
    } else if (msg.type === 'panTo') {
      map.panTo([msg.lat, msg.lng], { animate: true, duration: 0.5 });
    } else if (msg.type === 'setFollow') {
      followMode = msg.value;
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

let WebViewComponent: any = null;
if (Platform.OS !== "web") {
  WebViewComponent = require("react-native-webview").default;
}

const LeafletMapView = forwardRef<LeafletMapHandle, LeafletMapViewProps>(
  (
    {
      center,
      zoom = 14,
      coordinates = [],
      markerCoordinate,
      interactive = true,
      followMode = false,
      showUserLocation = false,
      onTap,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<any>(null);

    const postMessage = (payload: object) => {
      if (Platform.OS === "web") return;
      const js = `handleMessage(${JSON.stringify(JSON.stringify(payload))}); true;`;
      webViewRef.current?.injectJavaScript(js);
    };

    useImperativeHandle(ref, () => ({
      update: (coords: Coord[], marker?: Coord) => {
        postMessage({ type: "update", coords, marker: marker ?? null });
      },
      locateUser: () => {
        postMessage({ type: "locateUser" });
      },
      panTo: (coord: Coord) => {
        postMessage({ type: "panTo", lat: coord.latitude, lng: coord.longitude });
      },
    }));

    if (Platform.OS === "web") {
      return (
        <View
          style={[
            {
              overflow: "hidden",
              backgroundColor: "#050505",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            },
            style,
          ]}
        >
          <MapPin size={22} color="#2a2a2a" strokeWidth={1.5} />
          <Text
            style={{
              color: "#2a2a2a",
              fontSize: 9,
              letterSpacing: 2,
              fontWeight: "700",
            }}
          >
            MAP VIEW
          </Text>
          <Text
            style={{
              color: "#1a1a1a",
              fontSize: 9,
              textAlign: "center",
              letterSpacing: 0.5,
            }}
          >
            Open on mobile device
          </Text>
        </View>
      );
    }

    const html = buildHTML(
      center,
      zoom,
      coordinates,
      markerCoordinate,
      interactive,
      followMode,
      showUserLocation
    );

    const handleWebViewMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === "tap" && onTap) {
          onTap({ latitude: data.lat, longitude: data.lng });
        }
      } catch (e) {
        console.warn("[LeafletMapView] message parse error:", e);
      }
    };

    return (
      <View style={[{ overflow: "hidden" }, style]}>
        <WebViewComponent
          ref={webViewRef}
          source={{ html }}
          style={{ flex: 1, backgroundColor: "#000" }}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          geolocationEnabled
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onMessage={handleWebViewMessage}
        />
      </View>
    );
  }
);

export default LeafletMapView;
