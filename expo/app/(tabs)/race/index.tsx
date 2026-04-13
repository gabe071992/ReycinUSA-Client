import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  PanResponder,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import LeafletMapView, { LeafletMapHandle } from "@/components/LeafletMapView";
import * as Location from "expo-location";
import {
  Flag,
  MapPin,
  Play,
  Square,
  RotateCcw,
  TrendingUp,
  Zap,
  WifiOff,
  X,
  Move,
  ChevronRight,
  Plus,
  Navigation,
  Maximize2,
  Send,
  BookmarkPlus,
  Mic,
  Check,
  Timer,
} from "lucide-react-native";
import TuningConsole from "@/app/(tabs)/race/tuning";
import LeagueModule from "@/app/(tabs)/race/league/LeagueModule";
import { useOBD } from "@/providers/OBDProvider";
import { useLapTimer } from "@/providers/LapTimerProvider";
import { usePIT } from "@/providers/PITProvider";
import type { MsgPriority, PitLogType } from "@/providers/PITProvider";
import { useTracks } from "@/providers/TracksProvider";
import type { Track, TrackCoordinate, TrackWaypoint } from "@/providers/TracksProvider";

type RaceTab = "dash" | "timer" | "tracks" | "tuning" | "pit" | "league";



type FloatData = {
  visible: boolean;
  track: Track | null;
  coords: TrackCoordinate[];
};

const KNOWN_TRACKS: Track[] = [
  { id: "hallett", name: "Hallett Motor Racing Circuit", location: "Jennings, OK", length_km: 2.623, center: { latitude: 36.1597, longitude: -96.5916 }, coordinates: [] },
  { id: "laguna-seca", name: "WeatherTech Raceway Laguna Seca", location: "Monterey, CA", length_km: 3.602, center: { latitude: 36.5844, longitude: -121.7547 }, coordinates: [] },
  { id: "road-atlanta", name: "Michelin Raceway Road Atlanta", location: "Braselton, GA", length_km: 4.088, center: { latitude: 34.1494, longitude: -83.8133 }, coordinates: [] },
  { id: "watkins-glen", name: "Watkins Glen International", location: "Watkins Glen, NY", length_km: 5.435, center: { latitude: 42.3368, longitude: -76.9274 }, coordinates: [] },
  { id: "mid-ohio", name: "Mid-Ohio Sports Car Course", location: "Lexington, OH", length_km: 3.839, center: { latitude: 40.6960, longitude: -82.6448 }, coordinates: [] },
  { id: "cota", name: "Circuit of The Americas", location: "Austin, TX", length_km: 5.513, center: { latitude: 30.1328, longitude: -97.6411 }, coordinates: [] },
  { id: "willow-springs", name: "Willow Springs International Raceway", location: "Rosamond, CA", length_km: 3.989, center: { latitude: 34.8883, longitude: -118.2634 }, coordinates: [] },
  { id: "vir", name: "Virginia International Raceway", location: "Alton, VA", length_km: 5.265, center: { latitude: 36.5526, longitude: -79.2068 }, coordinates: [] },
  { id: "sonoma", name: "Sonoma Raceway", location: "Sonoma, CA", length_km: 3.863, center: { latitude: 38.1606, longitude: -122.4543 }, coordinates: [] },
  { id: "sebring", name: "Sebring International Raceway", location: "Sebring, FL", length_km: 6.019, center: { latitude: 27.4542, longitude: -81.3480 }, coordinates: [] },
  { id: "daytona", name: "Daytona International Speedway", location: "Daytona Beach, FL", length_km: 4.023, center: { latitude: 29.1853, longitude: -81.0709 }, coordinates: [] },
  { id: "thunderhill", name: "Thunderhill Raceway Park", location: "Willows, CA", length_km: 4.832, center: { latitude: 39.5397, longitude: -122.3211 }, coordinates: [] },
  { id: "spa", name: "Circuit de Spa-Francorchamps", location: "Stavelot, Belgium", length_km: 7.004, center: { latitude: 50.4372, longitude: 5.9714 }, coordinates: [] },
  { id: "nurburgring", name: "Nürburgring Nordschleife", location: "Nürburg, Germany", length_km: 20.832, center: { latitude: 50.3356, longitude: 6.9475 }, coordinates: [] },
  { id: "suzuka", name: "Suzuka Circuit", location: "Suzuka, Japan", length_km: 5.807, center: { latitude: 34.8431, longitude: 136.5407 }, coordinates: [] },
  { id: "monza", name: "Autodromo Nazionale Monza", location: "Monza, Italy", length_km: 5.793, center: { latitude: 45.6156, longitude: 9.2811 }, coordinates: [] },
];

function haversineKm(a: TrackCoordinate, b: TrackCoordinate): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const sinDlat = Math.sin(dLat / 2);
  const sinDlon = Math.sin(dLon / 2);
  const h =
    sinDlat * sinDlat +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      sinDlon *
      sinDlon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function estimateLength(coords: TrackCoordinate[]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineKm(coords[i - 1], coords[i]);
  }
  return Math.round(total * 100) / 100;
}



function formatElapsed(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function FloatingMapOverlay({
  track,
  coords,
  onClose,
}: {
  track: Track;
  coords: TrackCoordinate[];
  onClose: () => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 16, y: 88 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        floatStyles.container,
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <View style={floatStyles.handle} {...panResponder.panHandlers}>
        <Move size={11} color="#555" strokeWidth={2} />
        <Text style={floatStyles.trackName} numberOfLines={1}>
          {track.name}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <X size={13} color="#555" strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <LeafletMapView
        center={track.center}
        zoom={14}
        coordinates={coords}
        markerCoordinate={coords.length === 0 ? track.center : undefined}
        interactive={false}
        style={floatStyles.map}
      />
    </Animated.View>
  );
}

const floatStyles = StyleSheet.create({
  container: {
    position: "absolute",
    width: 200,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#000",
    zIndex: 999,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  handle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: "#080808",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
  },
  trackName: {
    flex: 1,
    fontSize: 9,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.5,
  },
  map: {
    width: "100%",
    height: 150,
  },
  markerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF1801",
    borderWidth: 2,
    borderColor: "#fff",
  },
});

function TrackCard({
  track,
  isActive,
  onPress,
}: {
  track: Track;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={trackListStyles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`track-card-${track.id}`}
    >
      <View style={trackListStyles.cardLeft}>
        <View style={[trackListStyles.iconDot, isActive && trackListStyles.iconDotActive]}>
          <MapPin size={13} color={isActive ? "#34C759" : "#FF1801"} strokeWidth={2} />
        </View>
        <View style={trackListStyles.cardInfo}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={trackListStyles.cardName} numberOfLines={1}>
              {track.name}
            </Text>
            {isActive && (
              <View style={trackListStyles.activeBadge}>
                <Text style={trackListStyles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={trackListStyles.cardMeta}>
            {track.location}
            {"  ·  "}
            {track.length_km} km
          </Text>
          {track.isUserRecorded && track.recordedAt && (
            <Text style={trackListStyles.cardDate}>
              {new Date(track.recordedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      <ChevronRight size={16} color="#333" strokeWidth={2} />
    </TouchableOpacity>
  );
}

const trackListStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconDot: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  iconDotActive: {
    backgroundColor: "rgba(52,199,89,0.08)",
    borderColor: "#0a2a10",
  },
  activeBadge: {
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: "#34C759",
    letterSpacing: 1,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  cardMeta: {
    fontSize: 11,
    color: "#444",
  },
  cardDate: {
    fontSize: 10,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
});

function TracksScreen({
  onFloat,
}: {
  onFloat: (track: Track, coords: TrackCoordinate[]) => void;
}) {
  const { userTracks, activeTrackId, setActiveTrackId, saveTrack, deleteTrack, renameTrack, addWaypoint } = useTracks();
  const [listMode, setListMode] = useState<"known" | "mine">("known");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCoords, setRecordedCoords] = useState<TrackCoordinate[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [submitSent, setSubmitSent] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState<string | null>(null);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [pendingCoords, setPendingCoords] = useState<TrackCoordinate[]>([]);
  const [trackNameInput, setTrackNameInput] = useState("");
  const [trackLocationInput, setTrackLocationInput] = useState("User Recorded");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showWaypointModal, setShowWaypointModal] = useState(false);
  const [pendingWaypointCoord, setPendingWaypointCoord] = useState<TrackCoordinate | null>(null);
  const [waypointLabelInput, setWaypointLabelInput] = useState("");
  const [liveWaypoints, setLiveWaypoints] = useState<TrackWaypoint[]>([]);
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [markLabelInput, setMarkLabelInput] = useState("");

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const recordStartRef = useRef(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<LeafletMapHandle>(null);
  const recordedCoordsRef = useRef<TrackCoordinate[]>([]);

  useEffect(() => {
    return () => {
      if (watcherRef.current) watcherRef.current.remove();
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      setLocationError("GPS recording requires the mobile app. Track Library is available on all platforms.");
      return;
    }
    setLocationError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location permission is required to record a track.");
      return;
    }
    recordedCoordsRef.current = [];
    setRecordedCoords([]);
    setLiveWaypoints([]);
    setRecordElapsed(0);
    recordStartRef.current = Date.now();
    setIsRecording(true);
    elapsedRef.current = setInterval(() => {
      setRecordElapsed(Date.now() - recordStartRef.current);
    }, 500);
    watcherRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
      (loc) => {
        const coord: TrackCoordinate = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setRecordedCoords((prev) => {
          const next = [...prev, coord];
          recordedCoordsRef.current = next;
          if (next.length > 1 && mapRef.current) mapRef.current.update(next, next[next.length - 1]);
          return next;
        });
      }
    );
  }, []);

  const stopRecording = useCallback(() => {
    if (watcherRef.current) { watcherRef.current.remove(); watcherRef.current = null; }
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    setIsRecording(false);
    const coords = recordedCoordsRef.current;
    const dist = estimateLength(coords);
    if (coords.length < 10 || dist < 0.05) {
      setLocationError(
        coords.length < 10
          ? `Recording too short — only ${coords.length} GPS points captured. Drive further.`
          : `Track too short (${(dist * 1000).toFixed(0)}m). Minimum is 50m.`
      );
      return;
    }
    setPendingCoords([...coords]);
    setTrackNameInput(`Track ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`);
    setTrackLocationInput("User Recorded");
    setShowNamingModal(true);
  }, []);

  const handleSaveNamed = useCallback(() => {
    if (!trackNameInput.trim() || pendingCoords.length === 0) return;
    const newTrack: Track = {
      id: `user-${Date.now()}`,
      name: trackNameInput.trim(),
      location: trackLocationInput.trim() || "User Recorded",
      length_km: estimateLength(pendingCoords),
      center: pendingCoords[Math.floor(pendingCoords.length / 2)],
      coordinates: [...pendingCoords],
      waypoints: [...liveWaypoints],
      isUserRecorded: true,
      recordedAt: new Date().toISOString(),
    };
    saveTrack(newTrack);
    setShowNamingModal(false);
    setPendingCoords([]);
    setTrackNameInput("");
    setSelectedTrack(newTrack);
    setShowMap(true);
    setListMode("mine");
    console.log("[Tracks] Saved:", newTrack.id, newTrack.name, newTrack.length_km, "km");
  }, [trackNameInput, trackLocationInput, pendingCoords, saveTrack, liveWaypoints]);

  const handleSelectTrack = useCallback((track: Track) => { setSelectedTrack(track); setShowMap(true); }, []);
  const handleBack = useCallback(() => { setShowMap(false); setSelectedTrack(null); }, []);
  const handleFloat = useCallback(() => { if (selectedTrack) onFloat(selectedTrack, selectedTrack.coordinates); }, [selectedTrack, onFloat]);

  const handleSubmit = useCallback(async (track: Track) => {
    setSubmitLoading(track.id);
    try {
      const { database: db } = await import("@/config/firebase");
      const { ref: dbRef, push } = await import("firebase/database");
      await push(dbRef(db, "reycinUSA/track_submissions"), {
        id: track.id, name: track.name, location: track.location,
        length_km: track.length_km, center: track.center,
        coordinates: track.coordinates, waypoints: track.waypoints ?? [],
        recordedAt: track.recordedAt, submittedAt: new Date().toISOString(),
        platform: Platform.OS,
      });
      setSubmitSent(track.id);
      console.log("[Tracks] Submitted:", track.id);
      setTimeout(() => setSubmitSent(null), 4000);
    } catch (e) {
      console.error("[Tracks] Submit failed:", e);
      setLocationError("Submission failed — check network connection.");
    } finally {
      setSubmitLoading(null);
    }
  }, []);

  const handleDeleteConfirm = useCallback((trackId: string) => {
    deleteTrack(trackId);
    setShowDeleteConfirm(null);
    if (selectedTrack?.id === trackId) { setShowMap(false); setSelectedTrack(null); }
  }, [deleteTrack, selectedTrack]);

  const handleRenameConfirm = useCallback(() => {
    if (!renameTarget || !renameInput.trim()) return;
    renameTrack(renameTarget, renameInput.trim());
    setSelectedTrack((prev) => prev?.id === renameTarget ? { ...prev, name: renameInput.trim() } : prev);
    setShowRenameModal(false); setRenameTarget(null); setRenameInput("");
  }, [renameTarget, renameInput, renameTrack]);

  const handleMapTap = useCallback((coord: TrackCoordinate) => {
    if (selectedTrack?.isUserRecorded) { setPendingWaypointCoord(coord); setWaypointLabelInput(""); setShowWaypointModal(true); }
  }, [selectedTrack]);

  const handleMarkPoint = useCallback(() => {
    const coords = recordedCoordsRef.current;
    if (coords.length === 0) return;
    const coord = coords[coords.length - 1];
    const wp: TrackWaypoint = { id: `wp-${Date.now()}`, label: markLabelInput.trim() || "Waypoint", coordinate: coord };
    setLiveWaypoints((prev) => [...prev, wp]);
    setShowMarkModal(false);
    setMarkLabelInput("");
    console.log("[Tracks] Marked point during recording:", wp.label, coord);
  }, [markLabelInput]);

  const handleSaveWaypoint = useCallback(() => {
    if (!pendingWaypointCoord || !selectedTrack) return;
    const waypoint: TrackWaypoint = { id: `wp-${Date.now()}`, label: waypointLabelInput.trim() || "Waypoint", coordinate: pendingWaypointCoord };
    addWaypoint(selectedTrack.id, waypoint);
    setSelectedTrack((prev) => prev ? { ...prev, waypoints: [...(prev.waypoints ?? []), waypoint] } : prev);
    setShowWaypointModal(false); setPendingWaypointCoord(null); setWaypointLabelInput("");
  }, [pendingWaypointCoord, waypointLabelInput, selectedTrack, addWaypoint]);

  const filteredKnownTracks = useMemo(() => {
    if (!searchQuery.trim()) return KNOWN_TRACKS;
    const q = searchQuery.toLowerCase();
    return KNOWN_TRACKS.filter((t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q));
  }, [searchQuery]);

  if (isRecording) {
    const liveCenter = recordedCoordsRef.current.length > 0
      ? recordedCoordsRef.current[recordedCoordsRef.current.length - 1]
      : { latitude: 36.5844, longitude: -121.7547 };
    return (
      <View style={recStyles.root}>
        <View style={recStyles.topBar}>
          <View style={recStyles.recBadge}><View style={recStyles.recDot} /><Text style={recStyles.recLabel}>RECORDING</Text></View>
          <Text style={recStyles.recTime}>{formatElapsed(recordElapsed)}</Text>
          <Text style={recStyles.recPts}>{recordedCoords.length} pts</Text>
        </View>
        <View style={{ flex: 1 }}>
          <LeafletMapView ref={mapRef} center={liveCenter} zoom={16} coordinates={[]} interactive={false} followMode={true} showUserLocation={true} style={recStyles.map} />
          <TouchableOpacity style={recStyles.locateBtn} onPress={() => mapRef.current?.locateUser()} activeOpacity={0.75} testID="recording-locate-btn">
            <Navigation size={16} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={recStyles.bottomBar}>
          <View style={recStyles.statsRow}>
            <View style={recStyles.statCell}><Text style={recStyles.statLabel}>DISTANCE</Text><Text style={recStyles.statValue}>{estimateLength(recordedCoords).toFixed(2)} km</Text></View>
            <View style={recStyles.statDiv} />
            <View style={recStyles.statCell}><Text style={recStyles.statLabel}>POINTS</Text><Text style={recStyles.statValue}>{recordedCoords.length}</Text></View>
            <View style={recStyles.statDiv} />
            <View style={recStyles.statCell}><Text style={recStyles.statLabel}>TIME</Text><Text style={recStyles.statValue}>{formatElapsed(recordElapsed)}</Text></View>
          </View>
          <TouchableOpacity
            style={[recStyles.markBtn, recordedCoords.length === 0 && recStyles.markBtnDisabled]}
            onPress={() => { setMarkLabelInput(""); setShowMarkModal(true); }}
            activeOpacity={0.8}
            disabled={recordedCoords.length === 0}
            testID="mark-point-btn"
          >
            <MapPin size={14} color="#FFD600" strokeWidth={2} />
            <Text style={recStyles.markBtnText}>MARK POINT</Text>
            {liveWaypoints.length > 0 && <Text style={recStyles.markBtnCount}>{liveWaypoints.length} marked</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={recStyles.stopBtn} onPress={stopRecording} activeOpacity={0.8} testID="stop-recording-btn">
            <Square size={16} fill="#000" color="#000" strokeWidth={0} />
            <Text style={recStyles.stopBtnText}>STOP RECORDING</Text>
          </TouchableOpacity>
        </View>
        <Modal visible={showMarkModal} transparent animationType="slide" onRequestClose={() => setShowMarkModal(false)} statusBarTranslucent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={namingModalStyles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMarkModal(false)} />
            <View style={namingModalStyles.sheet}>
              <View style={namingModalStyles.handle} />
              <View style={namingModalStyles.headerRow}>
                <MapPin size={15} color="#FFD600" strokeWidth={2} />
                <Text style={namingModalStyles.title}>MARK POINT</Text>
              </View>
              {recordedCoordsRef.current.length > 0 && (
                <Text style={namingModalStyles.coordText}>
                  {recordedCoordsRef.current[recordedCoordsRef.current.length - 1].latitude.toFixed(5)},{" "}
                  {recordedCoordsRef.current[recordedCoordsRef.current.length - 1].longitude.toFixed(5)}
                </Text>
              )}
              <TextInput
                style={namingModalStyles.input}
                value={markLabelInput}
                onChangeText={setMarkLabelInput}
                autoFocus
                placeholder="e.g. Start/Finish, Turn 1, Pit Entry..."
                placeholderTextColor="#2a2a2a"
                autoCorrect={false}
                testID="mark-point-input"
              />
              <TouchableOpacity style={namingModalStyles.saveBtn} onPress={handleMarkPoint} activeOpacity={0.85} testID="confirm-mark-point-btn">
                <Text style={namingModalStyles.saveBtnText}>MARK POINT</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (showMap && selectedTrack) {
    const isActive = activeTrackId === selectedTrack.id;
    const isUserTrack = selectedTrack.isUserRecorded === true;
    return (
      <View style={mapViewStyles.root}>
        <View style={mapViewStyles.topBar}>
          <TouchableOpacity style={mapViewStyles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <Text style={mapViewStyles.backText}>← BACK</Text>
          </TouchableOpacity>
          <View style={mapViewStyles.topBtns}>
            <TouchableOpacity style={mapViewStyles.locateBtn} onPress={() => mapRef.current?.locateUser()} activeOpacity={0.7} testID="locate-me-btn">
              <Navigation size={13} color="#007AFF" strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={mapViewStyles.floatBtn} onPress={handleFloat} activeOpacity={0.7} testID="float-map-btn">
              <Maximize2 size={13} color="#FF1801" strokeWidth={2} />
              <Text style={mapViewStyles.floatBtnText}>FLOAT</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <LeafletMapView
            ref={mapRef}
            center={selectedTrack.center}
            zoom={14}
            coordinates={selectedTrack.coordinates}
            markerCoordinate={selectedTrack.coordinates.length === 0 ? selectedTrack.center : undefined}
            interactive={true}
            showUserLocation={true}
            onTap={isUserTrack ? handleMapTap : undefined}
            style={mapViewStyles.map}
          />
        </View>
        <View style={mapViewStyles.infoCard}>
          <View style={mapViewStyles.infoRow}>
            <View style={mapViewStyles.infoMain}>
              <View style={mapViewStyles.infoNameRow}>
                <Text style={mapViewStyles.infoName} numberOfLines={1}>{selectedTrack.name}</Text>
                {isActive && <View style={mapViewStyles.activePill}><Text style={mapViewStyles.activePillText}>ACTIVE</Text></View>}
              </View>
              <Text style={mapViewStyles.infoMeta}>{selectedTrack.location}  ·  {selectedTrack.length_km} km</Text>
              {selectedTrack.coordinates.length === 0 && <Text style={mapViewStyles.noDataNote}>Boundary data pending — tap FLOAT to keep map visible while driving</Text>}
              {isUserTrack && <Text style={mapViewStyles.tapHint}>Tap map to place waypoint markers</Text>}
            </View>
            <View style={mapViewStyles.actionCol}>
              <TouchableOpacity
                style={[mapViewStyles.actionBtn, isActive && mapViewStyles.actionBtnActive]}
                onPress={() => setActiveTrackId(isActive ? null : selectedTrack.id)}
                activeOpacity={0.75} testID="set-active-track-btn"
              >
                <Text style={[mapViewStyles.actionBtnText, isActive && mapViewStyles.actionBtnTextActive]}>{isActive ? "ACTIVE ✓" : "SET ACTIVE"}</Text>
              </TouchableOpacity>
              {isUserTrack && (
                <>
                  <TouchableOpacity
                    style={[mapViewStyles.actionBtn, submitSent === selectedTrack.id && mapViewStyles.actionBtnSent]}
                    onPress={() => handleSubmit(selectedTrack)}
                    disabled={!!submitLoading || submitSent === selectedTrack.id}
                    activeOpacity={0.75} testID="submit-track-btn"
                  >
                    {submitSent === selectedTrack.id ? <Text style={mapViewStyles.actionBtnText}>SENT ✓</Text>
                      : submitLoading === selectedTrack.id ? <Text style={mapViewStyles.actionBtnText}>...</Text>
                      : <><Send size={9} color="#FF1801" strokeWidth={2} /><Text style={mapViewStyles.actionBtnText}>SUBMIT</Text></>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={mapViewStyles.actionBtn}
                    onPress={() => { setRenameTarget(selectedTrack.id); setRenameInput(selectedTrack.name); setShowRenameModal(true); }}
                    activeOpacity={0.75} testID="rename-track-btn"
                  >
                    <Text style={mapViewStyles.actionBtnText}>RENAME</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[mapViewStyles.actionBtn, mapViewStyles.actionBtnDelete]}
                    onPress={() => setShowDeleteConfirm(selectedTrack.id)}
                    activeOpacity={0.75} testID="delete-track-btn"
                  >
                    <Text style={[mapViewStyles.actionBtnText, mapViewStyles.actionBtnTextDelete]}>DELETE</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          {isUserTrack && (selectedTrack.waypoints ?? []).length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={mapViewStyles.waypointScroll} contentContainerStyle={mapViewStyles.waypointContent}>
              {(selectedTrack.waypoints ?? []).map((wp) => (
                <View key={wp.id} style={mapViewStyles.waypointChip}>
                  <MapPin size={9} color="#FFD600" strokeWidth={2} />
                  <Text style={mapViewStyles.waypointChipText}>{wp.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <Modal visible={showDeleteConfirm !== null} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(null)} statusBarTranslucent>
          <Pressable style={confirmModalStyles.overlay} onPress={() => setShowDeleteConfirm(null)}>
            <View style={confirmModalStyles.card}>
              <Text style={confirmModalStyles.title}>DELETE TRACK?</Text>
              <Text style={confirmModalStyles.sub}>This cannot be undone.</Text>
              <View style={confirmModalStyles.btns}>
                <TouchableOpacity style={confirmModalStyles.cancelBtn} onPress={() => setShowDeleteConfirm(null)} activeOpacity={0.75}><Text style={confirmModalStyles.cancelText}>CANCEL</Text></TouchableOpacity>
                <TouchableOpacity style={confirmModalStyles.confirmBtn} onPress={() => showDeleteConfirm && handleDeleteConfirm(showDeleteConfirm)} activeOpacity={0.75} testID="confirm-delete-btn"><Text style={confirmModalStyles.confirmText}>DELETE</Text></TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={showRenameModal} transparent animationType="slide" onRequestClose={() => setShowRenameModal(false)} statusBarTranslucent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={namingModalStyles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowRenameModal(false)} />
            <View style={namingModalStyles.sheet}>
              <View style={namingModalStyles.handle} />
              <Text style={namingModalStyles.title}>RENAME TRACK</Text>
              <TextInput style={namingModalStyles.input} value={renameInput} onChangeText={setRenameInput} autoFocus placeholder="Track name..." placeholderTextColor="#2a2a2a" autoCorrect={false} testID="rename-track-input" />
              <TouchableOpacity style={namingModalStyles.saveBtn} onPress={handleRenameConfirm} activeOpacity={0.85} testID="confirm-rename-btn">
                <Text style={namingModalStyles.saveBtnText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={showWaypointModal} transparent animationType="slide" onRequestClose={() => setShowWaypointModal(false)} statusBarTranslucent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={namingModalStyles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowWaypointModal(false)} />
            <View style={namingModalStyles.sheet}>
              <View style={namingModalStyles.handle} />
              <Text style={namingModalStyles.title}>ADD WAYPOINT</Text>
              {pendingWaypointCoord && <Text style={namingModalStyles.coordText}>{pendingWaypointCoord.latitude.toFixed(5)}, {pendingWaypointCoord.longitude.toFixed(5)}</Text>}
              <TextInput style={namingModalStyles.input} value={waypointLabelInput} onChangeText={setWaypointLabelInput} autoFocus placeholder="Label (e.g. Turn 1, Pit Entry)..." placeholderTextColor="#2a2a2a" autoCorrect={false} testID="waypoint-label-input" />
              <TouchableOpacity style={namingModalStyles.saveBtn} onPress={handleSaveWaypoint} activeOpacity={0.85} testID="save-waypoint-btn">
                <Text style={namingModalStyles.saveBtnText}>ADD WAYPOINT</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  return (
    <View style={tracksStyles.root}>
      <View style={tracksStyles.segmentBar}>
        <TouchableOpacity style={[tracksStyles.segment, listMode === "known" && tracksStyles.segmentActive]} onPress={() => setListMode("known")} activeOpacity={0.7}>
          <Text style={[tracksStyles.segmentText, listMode === "known" && tracksStyles.segmentTextActive]}>TRACK LIBRARY</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[tracksStyles.segment, listMode === "mine" && tracksStyles.segmentActive]} onPress={() => setListMode("mine")} activeOpacity={0.7}>
          <Text style={[tracksStyles.segmentText, listMode === "mine" && tracksStyles.segmentTextActive]}>
            MY TRACKS{userTracks.length > 0 && <Text style={tracksStyles.countBadge}> {userTracks.length}</Text>}
          </Text>
        </TouchableOpacity>
      </View>

      {listMode === "known" && (
        <>
          <View style={tracksStyles.searchWrap}>
            <TextInput style={tracksStyles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search tracks..." placeholderTextColor="#2a2a2a" autoCorrect={false} clearButtonMode="while-editing" testID="track-search-input" />
          </View>
          <FlatList
            data={filteredKnownTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <TrackCard track={item} isActive={activeTrackId === item.id} onPress={() => handleSelectTrack(item)} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListEmptyComponent={<View style={tracksStyles.emptyState}><Text style={tracksStyles.emptyTitle}>No tracks found</Text></View>}
          />
        </>
      )}

      {listMode === "mine" && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {locationError && (
            <View style={tracksStyles.errorBanner}>
              <Text style={tracksStyles.errorText}>{locationError}</Text>
              <TouchableOpacity onPress={() => setLocationError(null)} hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                <X size={14} color="#FF4444" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={tracksStyles.recordCta} onPress={startRecording} activeOpacity={0.8} testID="start-recording-btn">
            <View style={tracksStyles.recordCtaIcon}><Navigation size={18} color="#FF1801" strokeWidth={2} /></View>
            <View style={tracksStyles.recordCtaText}>
              <Text style={tracksStyles.recordCtaTitle}>Record New Track</Text>
              <Text style={tracksStyles.recordCtaSub}>{Platform.OS === "web" ? "Recording requires the mobile app" : "Uses device GPS to map boundary — start/stop from app"}</Text>
            </View>
            <Plus size={18} color="#FF1801" strokeWidth={2} />
          </TouchableOpacity>
          {userTracks.length === 0 && (
            <View style={tracksStyles.emptyState}>
              <BookmarkPlus size={32} color="#1a1a1a" strokeWidth={1.5} />
              <Text style={tracksStyles.emptyTitle}>No Recorded Tracks</Text>
              <Text style={tracksStyles.emptySub}>Drive your circuit and tap Record to map it. Recorded tracks can be submitted to the Reycin team for refinement.</Text>
            </View>
          )}
          {userTracks.map((track) => <TrackCard key={track.id} track={track} isActive={activeTrackId === track.id} onPress={() => handleSelectTrack(track)} />)}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <Modal visible={showNamingModal} transparent animationType="slide" onRequestClose={() => setShowNamingModal(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={namingModalStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNamingModal(false)} />
          <View style={namingModalStyles.sheet}>
            <View style={namingModalStyles.handle} />
            <View style={namingModalStyles.headerRow}>
              <Navigation size={15} color="#FF1801" strokeWidth={2} />
              <Text style={namingModalStyles.title}>NAME YOUR TRACK</Text>
            </View>
            <View style={namingModalStyles.statsRow}>
              <View style={namingModalStyles.statCell}><Text style={namingModalStyles.statLabel}>POINTS</Text><Text style={namingModalStyles.statValue}>{pendingCoords.length}</Text></View>
              <View style={namingModalStyles.statDiv} />
              <View style={namingModalStyles.statCell}><Text style={namingModalStyles.statLabel}>LENGTH</Text><Text style={namingModalStyles.statValue}>{estimateLength(pendingCoords).toFixed(2)} km</Text></View>
            </View>
            <View style={namingModalStyles.fieldSection}>
              <Text style={namingModalStyles.fieldLabel}>TRACK NAME</Text>
              <TextInput style={namingModalStyles.input} value={trackNameInput} onChangeText={setTrackNameInput} autoFocus placeholder="My track name..." placeholderTextColor="#2a2a2a" autoCorrect={false} testID="track-name-input" />
            </View>
            <View style={namingModalStyles.fieldSection}>
              <Text style={namingModalStyles.fieldLabel}>LOCATION (OPTIONAL)</Text>
              <TextInput style={namingModalStyles.input} value={trackLocationInput} onChangeText={setTrackLocationInput} placeholder="City, State..." placeholderTextColor="#2a2a2a" autoCorrect={false} testID="track-location-input" />
            </View>
            <TouchableOpacity
              style={[namingModalStyles.saveBtn, !trackNameInput.trim() && namingModalStyles.saveBtnDisabled]}
              onPress={handleSaveNamed} disabled={!trackNameInput.trim()} activeOpacity={0.85} testID="confirm-save-track-btn"
            >
              <Text style={namingModalStyles.saveBtnText}>SAVE TRACK</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const recStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  recBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF1801",
  },
  recLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 2,
  },
  recTime: {
    fontSize: 16,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  recPts: {
    fontSize: 11,
    color: "#444",
    fontVariant: ["tabular-nums"] as const,
  },
  map: { flex: 1 },
  liveMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,24,1,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF1801",
    borderWidth: 2,
    borderColor: "#fff",
  },
  bottomBar: {
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#111",
    padding: 16,
    gap: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080808",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
  },
  statCell: { flex: 1, alignItems: "center", gap: 3 },
  statDiv: { width: 1, height: 24, backgroundColor: "#1a1a1a" },
  statLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FF1801",
    borderRadius: 8,
    paddingVertical: 14,
  },
  stopBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 2,
  },
  markBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: "rgba(255,214,0,0.06)",
    borderWidth: 1,
    borderColor: "#2a2200",
    borderRadius: 8,
    paddingVertical: 11,
  },
  markBtnDisabled: { opacity: 0.3 },
  markBtnText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFD600",
    letterSpacing: 1.5,
  },
  markBtnCount: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#FFD600",
    opacity: 0.6,
  },
  locateBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
});

const mapViewStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  backText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1.5,
  },
  floatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#2a0a00",
    backgroundColor: "rgba(255,24,1,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  floatBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 1,
  },
  map: { flex: 1 },
  centerMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,24,1,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  centerMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF1801",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoCard: {
    backgroundColor: "#000",
    borderTopWidth: 1,
    borderTopColor: "#111",
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  infoMain: { flex: 1, gap: 4 },
  infoName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  infoMeta: { fontSize: 12, color: "#555" },
  noDataNote: {
    fontSize: 10,
    color: "#333",
    marginTop: 4,
    lineHeight: 15,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#2a0a00",
    backgroundColor: "rgba(255,24,1,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  submitBtnSent: {
    borderColor: "#0a2a00",
    backgroundColor: "rgba(52,199,89,0.06)",
  },
  submitBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 1,
  },
  topBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locateBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  infoNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  activePill: {
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  activePillText: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: "#34C759",
    letterSpacing: 1,
  },
  tapHint: {
    fontSize: 10,
    color: "#2a2a2a",
    marginTop: 4,
    fontStyle: "italic" as const,
  },
  actionCol: {
    gap: 6,
    alignItems: "flex-end",
    flexShrink: 0,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 80,
    justifyContent: "center",
  },
  actionBtnActive: {
    borderColor: "#0a2a10",
    backgroundColor: "rgba(52,199,89,0.1)",
  },
  actionBtnSent: {
    borderColor: "#0a2a00",
    backgroundColor: "rgba(52,199,89,0.06)",
  },
  actionBtnDelete: {
    borderColor: "#2a0a00",
    backgroundColor: "rgba(255,24,1,0.04)",
  },
  actionBtnText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#888",
    letterSpacing: 1,
  },
  actionBtnTextActive: {
    color: "#34C759",
  },
  actionBtnTextDelete: {
    color: "#FF3B30",
  },
  waypointScroll: {
    marginTop: 10,
  },
  waypointContent: {
    gap: 6,
    paddingRight: 4,
  },
  waypointChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#2a2200",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  waypointChipText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#FFD600",
  },
});

const tracksStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  segmentBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  segment: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  segmentActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#FF1801",
  },
  segmentText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  segmentTextActive: {
    color: "#FFF",
  },
  countBadge: {
    color: "#FF1801",
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    backgroundColor: "rgba(255,24,1,0.08)",
    borderWidth: 1,
    borderColor: "#2a0a00",
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: "#FF4444",
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  searchInput: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#FFF",
  },
  recordCta: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 16,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a0800",
    borderRadius: 10,
    gap: 12,
  },
  recordCtaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,24,1,0.08)",
    borderWidth: 1,
    borderColor: "#2a0800",
    alignItems: "center",
    justifyContent: "center",
  },
  recordCtaText: { flex: 1, gap: 3 },
  recordCtaTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  recordCtaSub: {
    fontSize: 11,
    color: "#444",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#2a2a2a",
    textAlign: "center",
    lineHeight: 18,
  },
});

const namingModalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" },
  sheet: {
    backgroundColor: "#080808",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  handle: { width: 36, height: 4, backgroundColor: "#222", borderRadius: 2, alignSelf: "center" as const, marginBottom: 4 },
  headerRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  title: { fontSize: 11, fontWeight: "700" as const, color: "#FFF", letterSpacing: 2 },
  coordText: { fontSize: 10, color: "#444", fontVariant: ["tabular-nums"] as const },
  statsRow: {
    flexDirection: "row" as const,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 10,
    padding: 14,
  },
  statCell: { flex: 1, alignItems: "center" as const, gap: 4 },
  statDiv: { width: 1, backgroundColor: "#1a1a1a" },
  statLabel: { fontSize: 9, fontWeight: "700" as const, color: "#333", letterSpacing: 1.5 },
  statValue: { fontSize: 16, fontWeight: "300" as const, color: "#FFF", fontVariant: ["tabular-nums"] as const },
  fieldSection: { gap: 6 },
  fieldLabel: { fontSize: 9, fontWeight: "700" as const, color: "#333", letterSpacing: 1.5 },
  input: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#FFF",
  },
  saveBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { fontSize: 13, fontWeight: "700" as const, color: "#000", letterSpacing: 1 },
});

const confirmModalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", alignItems: "center" as const, justifyContent: "center" as const, padding: 32 },
  card: {
    backgroundColor: "#0d0d0d",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    padding: 24,
    width: "100%" as const,
    gap: 10,
    alignItems: "center" as const,
  },
  title: { fontSize: 13, fontWeight: "700" as const, color: "#FFF", letterSpacing: 1.5 },
  sub: { fontSize: 12, color: "#444", textAlign: "center" as const },
  btns: { flexDirection: "row" as const, gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#111",
  },
  cancelText: { fontSize: 12, fontWeight: "600" as const, color: "#888" },
  confirmBtn: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
  },
  confirmText: { fontSize: 12, fontWeight: "700" as const, color: "#FFF" },
});

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${mins > 0 ? `${mins}:` : ""}${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

function formatTimeColon(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

const SHIFT_LIGHTS_CONFIG = [
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#FFD600" },
  { color: "#FFD600" },
  { color: "#FFD600" },
  { color: "#FF1801" },
  { color: "#FF1801" },
  { color: "#FF1801" },
];

function BarGauge({
  value,
  max,
  label,
  unit,
  accentColor,
  offline,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  accentColor: string;
  offline?: boolean;
}) {
  const pct = offline ? 0 : Math.min(value / max, 1);
  const barAnim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [pct, barAnim]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const displayColor = offline ? "#2a2a2a" : accentColor;

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.labelRow}>
        <Text style={[gaugeStyles.label, offline && gaugeStyles.labelOffline]}>{label}</Text>
        {offline ? (
          <Text style={gaugeStyles.offlineText}>OFFLINE</Text>
        ) : (
          <Text style={[gaugeStyles.value, { color: accentColor }]}>
            {Math.round(value)}
            <Text style={gaugeStyles.unit}> {unit}</Text>
          </Text>
        )}
      </View>
      <View style={gaugeStyles.track}>
        <Animated.View
          style={[
            gaugeStyles.fill,
            { width: barWidth, backgroundColor: displayColor },
          ]}
        />
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { gap: 5 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 10,
    fontWeight: "500",
    color: "#555",
  },
  track: {
    height: 6,
    backgroundColor: "#111",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  labelOffline: {
    color: "#2a2a2a",
  },
  offlineText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2a2a2a",
    letterSpacing: 1,
  },
});

function ShiftLights({ rpmPct }: { rpmPct: number }) {
  const litCount = Math.floor(rpmPct * SHIFT_LIGHTS_CONFIG.length);
  const allFlash = useRef(new Animated.Value(1)).current;

  const isMaxRpm = rpmPct >= 1;
  useEffect(() => {
    if (isMaxRpm) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(allFlash, {
            toValue: 0.1,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(allFlash, {
            toValue: 1,
            duration: 80,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      allFlash.stopAnimation();
      Animated.timing(allFlash, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }).start();
    }
  }, [isMaxRpm, allFlash]);

  return (
    <View style={shiftStyles.row}>
      {SHIFT_LIGHTS_CONFIG.map((cfg, i) => {
        const isLit = i < litCount;
        return (
          <Animated.View
            key={i}
            style={[
              shiftStyles.light,
              isLit && {
                backgroundColor: cfg.color,
                shadowColor: cfg.color,
                shadowOpacity: 0.9,
                shadowRadius: 8,
                elevation: 6,
              },
              !isLit && { backgroundColor: "#111", borderColor: "#1a1a1a" },
              isMaxRpm && isLit && { opacity: allFlash },
            ]}
          />
        );
      })}
    </View>
  );
}

const shiftStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  light: {
    flex: 1,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#222",
    maxWidth: 28,
  },
});

function estimateGear(rpm: number): number {
  if (rpm < 2500) return 1;
  if (rpm < 4000) return 2;
  if (rpm < 5500) return 3;
  if (rpm < 7000) return 4;
  if (rpm < 8500) return 5;
  return 6;
}

function DigitalDashScreen() {
  const { telemetry, connectionStatus, isConnected, firmwareObdState, gpsSource } = useOBD();
  const [isDemo, setIsDemo] = useState(false);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);

  const [demoRpm, setDemoRpm] = useState(0);
  const [demoSpeed, setDemoSpeed] = useState(0);
  const [demoGear, setDemoGear] = useState<number>(1);
  const [demoThrottle, setDemoThrottle] = useState(0);
  const [demoBrake, setDemoBrake] = useState(0);
  const [demoCoolant, setDemoCoolant] = useState(90);
  const [demoIntake, setDemoIntake] = useState(38);
  const [demoVoltage, setDemoVoltage] = useState(13.8);
  const [lapTime, setLapTime] = useState(0);
  const [lastLap, setLastLap] = useState<number | null>(null);

  const lapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lapStartRef = useRef(0);

  const MAX_RPM = 9800;

  // ── Demo mode simulation ───────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) {
      lapStartRef.current = Date.now();
      lapTimerRef.current = setInterval(() => {
        setLapTime(Date.now() - lapStartRef.current);
      }, 50);
      demoRef.current = setInterval(() => {
        tickRef.current += 1;
        const t = tickRef.current;
        const cycle = (t % 300) / 300;
        const rpmVal = 1500 + Math.abs(Math.sin(cycle * Math.PI * 2)) * 7200 + Math.random() * 300;
        const spd = Math.round((rpmVal / MAX_RPM) * 118 + Math.random() * 4);
        const thr = Math.round(Math.max(0, Math.sin(cycle * Math.PI * 2) * 100));
        const brk = thr < 20 ? Math.round(Math.random() * 60) : 0;
        setDemoRpm(rpmVal);
        setDemoSpeed(spd);
        setDemoGear(estimateGear(rpmVal));
        setDemoThrottle(thr);
        setDemoBrake(brk);
        setDemoCoolant(90 + Math.sin(t * 0.01) * 15 + Math.random() * 2);
        setDemoIntake(38 + Math.sin(t * 0.008) * 6 + Math.random() * 2);
        setDemoVoltage(13.2 + Math.random() * 0.8);
        if (t % 240 === 0 && t > 0) {
          const lt = Date.now() - lapStartRef.current;
          setLastLap(lt);
          lapStartRef.current = Date.now();
          setLapTime(0);
        }
      }, 50);
    } else {
      if (demoRef.current) clearInterval(demoRef.current);
      if (lapTimerRef.current) clearInterval(lapTimerRef.current);
      tickRef.current = 0;
      setDemoRpm(0); setDemoSpeed(0); setDemoGear(1);
      setDemoThrottle(0); setDemoBrake(0);
      setDemoCoolant(90); setDemoIntake(38); setDemoVoltage(13.8);
      setLapTime(0); setLastLap(null);
    }
    return () => {
      if (demoRef.current) clearInterval(demoRef.current);
      if (lapTimerRef.current) clearInterval(lapTimerRef.current);
    };
  }, [isDemo]);

  // ── Shared lap timer (persists across race tabs) ───────────────────────────
  const { elapsed: timerElapsed, lastLap: timerLastLap } = useLapTimer();

  // ── Resolved display values ────────────────────────────────────────────────
  const isLive = isConnected && !isDemo;

  const rpm        = isDemo ? demoRpm        : (telemetry?.rpm ?? undefined);
  const speed      = isDemo ? demoSpeed       : (telemetry?.gps?.speed_kmh ?? telemetry?.speed_kmh ?? undefined);
  const throttle   = isDemo ? demoThrottle   : (telemetry?.throttle_pct ?? undefined);
  const brake      = isDemo ? demoBrake      : undefined;
  const coolant    = isDemo ? demoCoolant    : (telemetry?.ect_c ?? undefined);
  const intake     = isDemo ? demoIntake     : (telemetry?.iat_c ?? undefined);
  const voltage    = isDemo ? demoVoltage    : (telemetry?.vbat ?? undefined);
  const gear       = isDemo ? demoGear       : (rpm !== undefined ? estimateGear(rpm) : undefined);
  const displayLap = isDemo ? lapTime : timerElapsed;
  const displayLastLap = isDemo ? lastLap : timerLastLap;

  const rpmSafe  = rpm ?? 0;
  const rpmPct   = rpmSafe / MAX_RPM;
  const rpmColor = rpmPct < 0.65 ? "#FFFFFF" : rpmPct < 0.82 ? "#FFD600" : "#FF1801";

  // ── Connection badge logic ─────────────────────────────────────────────────
  const connColor = isDemo
    ? "#FFD600"
    : isConnected
    ? "#34C759"
    : connectionStatus === "connecting"
    ? "#FF9500"
    : "#444";

  const connLabel = isDemo
    ? "DEMO"
    : isConnected
    ? "LIVE"
    : connectionStatus === "connecting"
    ? "CONNECTING"
    : "NO SIGNAL";

  const ConnIcon = isDemo
    ? Zap
    : isConnected
    ? Zap
    : WifiOff;

  // OBD state display
  const obdStateLabel =
    firmwareObdState === "active" ? "ACTIVE"
    : firmwareObdState === "no_data" ? "NO ECU"
    : firmwareObdState === "absent" ? "ABSENT"
    : isConnected ? "—"
    : "—";
  const obdStateColor =
    firmwareObdState === "active" ? "#34C759"
    : firmwareObdState === "no_data" ? "#FFD600"
    : firmwareObdState === "absent" ? "#FF1801"
    : "#2a2a2a";

  // GPS state display
  const gpsLabel =
    gpsSource === "esp32" ? "ESP32"
    : gpsSource === "phone" ? "PHONE"
    : "—";
  const gpsColor =
    gpsSource === "esp32" ? "#34C759"
    : gpsSource === "phone" ? "#FF9500"
    : "#2a2a2a";

  return (
    <View style={dashStyles.root}>
      <View style={dashStyles.topBar}>
        <View style={dashStyles.connBadge}>
          <ConnIcon size={11} color={connColor} strokeWidth={2} />
          <Text style={[dashStyles.connText, { color: connColor }]}>
            {connLabel}
          </Text>
          {isLive && telemetry && (
            <View style={dashStyles.liveIndicator} />
          )}
        </View>
        <TouchableOpacity
          style={[dashStyles.demoBtn, isDemo && dashStyles.demoBtnActive]}
          onPress={() => setIsDemo((v) => !v)}
          activeOpacity={0.75}
          testID="dash-demo-btn"
        >
          <Text style={[dashStyles.demoBtnText, isDemo && dashStyles.demoBtnTextActive]}>
            {isDemo ? "STOP DEMO" : "RUN DEMO"}
          </Text>
        </TouchableOpacity>
      </View>

      <ShiftLights rpmPct={isLive && rpm === undefined ? 0 : rpmPct} />

      <View style={dashStyles.centerSection}>
        <View style={dashStyles.speedBlock}>
          <Text style={dashStyles.speedLabel}>KM/H</Text>
          {isLive && speed === undefined ? (
            <Text style={[dashStyles.speedValue, dashStyles.offlineVal]}>—</Text>
          ) : (
            <Text style={dashStyles.speedValue}>
              {String(Math.round(speed ?? 0)).padStart(3, " ")}
            </Text>
          )}
        </View>

        <View style={dashStyles.gearBlock}>
          <Text style={dashStyles.gearLabel}>GEAR</Text>
          {isLive && gear === undefined ? (
            <Text style={[dashStyles.gearValue, { color: "#2a2a2a" }]}>—</Text>
          ) : (
            <Text style={[dashStyles.gearValue, { color: rpmColor }]}>{gear ?? 1}</Text>
          )}
        </View>

        <View style={dashStyles.lapBlock}>
          <Text style={dashStyles.lapLabel}>LAP</Text>
          <Text style={dashStyles.lapValue}>{formatTimeColon(displayLap)}</Text>
          {displayLastLap !== null && (
            <Text style={dashStyles.lastLapValue}>
              PREV {formatTime(displayLastLap)}
            </Text>
          )}
        </View>
      </View>

      <View style={dashStyles.rpmSection}>
        <View style={dashStyles.rpmLabelRow}>
          <Text style={dashStyles.rpmLabel}>RPM</Text>
          {isLive && rpm === undefined ? (
            <Text style={[dashStyles.rpmValue, { color: "#2a2a2a" }]}>OFFLINE</Text>
          ) : (
            <Text style={[dashStyles.rpmValue, { color: rpmColor }]}>
              {Math.round(rpmSafe).toLocaleString()}
            </Text>
          )}
          <Text style={dashStyles.rpmMax}>/ {MAX_RPM.toLocaleString()}</Text>
        </View>
        <View style={dashStyles.rpmTrack}>
          <Animated.View
            style={[
              dashStyles.rpmFill,
              {
                width: `${Math.min(rpmPct * 100, 100)}%`,
                backgroundColor: isLive && rpm === undefined ? "#1a1a1a" : rpmColor,
              },
            ]}
          />
          <View style={[dashStyles.rpmMarker, { left: "65%" }]} />
          <View style={[dashStyles.rpmMarker, { left: "82%" }]} />
        </View>
        <View style={dashStyles.rpmTicks}>
          {[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000].map(
            (v) => (
              <Text key={v} style={dashStyles.rpmTick}>
                {v === 0 ? "" : `${v / 1000}k`}
              </Text>
            )
          )}
        </View>
      </View>

      <View style={dashStyles.gaugeGrid}>
        <BarGauge
          value={throttle ?? 0}
          max={100}
          label="THROTTLE"
          unit="%"
          accentColor="#00FF41"
          offline={isLive && throttle === undefined}
        />
        <BarGauge
          value={brake ?? 0}
          max={100}
          label="BRAKE"
          unit="%"
          accentColor="#FF1801"
          offline={isLive || (!isDemo && brake === undefined)}
        />
        <BarGauge
          value={coolant ?? 0}
          max={130}
          label="COOLANT"
          unit="°C"
          accentColor="#00B4FF"
          offline={isLive && coolant === undefined}
        />
        <BarGauge
          value={intake ?? 0}
          max={80}
          label="INTAKE AIR"
          unit="°C"
          accentColor="#FF9500"
          offline={isLive && intake === undefined}
        />
      </View>

      <View style={dashStyles.statusRow}>
        <View style={dashStyles.statusCell}>
          <Text style={dashStyles.statusLabel}>VOLTAGE</Text>
          {voltage !== undefined ? (
            <Text style={dashStyles.statusValue}>{voltage.toFixed(1)}V</Text>
          ) : (
            <Text style={[dashStyles.statusValue, { color: "#2a2a2a" }]}>—</Text>
          )}
        </View>
        <View style={dashStyles.statusDivider} />
        <View style={dashStyles.statusCell}>
          <Text style={dashStyles.statusLabel}>OBD</Text>
          <Text style={[dashStyles.statusValue, { color: isDemo ? "#FFD600" : obdStateColor }]}>
            {isDemo ? "SIM" : obdStateLabel}
          </Text>
        </View>
        <View style={dashStyles.statusDivider} />
        <View style={dashStyles.statusCell}>
          <Text style={dashStyles.statusLabel}>GPS</Text>
          <Text style={[dashStyles.statusValue, { color: isDemo ? "#FFD600" : gpsColor }]}>
            {isDemo ? "SIM" : gpsLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const dashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  connBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  connText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  demoBtn: {
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  demoBtnActive: {
    borderColor: "#FF1801",
    backgroundColor: "rgba(255,24,1,0.08)",
  },
  demoBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1,
  },
  demoBtnTextActive: {
    color: "#FF1801",
  },
  centerSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  speedBlock: {
    alignItems: "center",
    flex: 1,
  },
  speedLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  speedValue: {
    fontSize: 72,
    fontWeight: "200",
    color: "#FFF",
    letterSpacing: -4,
    fontVariant: ["tabular-nums"] as const,
    lineHeight: 76,
  },
  gearBlock: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  gearLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  gearValue: {
    fontSize: 80,
    fontWeight: "700",
    lineHeight: 84,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -2,
  },
  lapBlock: {
    alignItems: "flex-end",
    flex: 1,
  },
  lapLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  lapValue: {
    fontSize: 20,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  lastLapValue: {
    fontSize: 11,
    fontWeight: "500",
    color: "#555",
    fontVariant: ["tabular-nums"] as const,
    marginTop: 2,
  },
  rpmSection: {
    gap: 4,
  },
  rpmLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  rpmLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 1.5,
  },
  rpmValue: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  rpmMax: {
    fontSize: 12,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  rpmTrack: {
    height: 14,
    backgroundColor: "#0a0a0a",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    position: "relative",
  },
  rpmFill: {
    height: "100%",
    borderRadius: 2,
  },
  rpmMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  rpmTicks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  rpmTick: {
    fontSize: 8,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
    width: 24,
    textAlign: "center",
  },
  gaugeGrid: {
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  statusCell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#1a1a1a",
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34C759",
    marginLeft: 2,
  },
  offlineVal: {
    color: "#2a2a2a",
    fontSize: 72,
  },
});

const QUICK_TRACKS_SAVE = [
  "Hallett Motor Racing Circuit",
  "Circuit of The Americas",
  "WeatherTech Raceway Laguna Seca",
  "Nürburgring Nordschleife",
  "Virginia International Raceway",
  "Michelin Raceway Road Atlanta",
];

function LapTimerScreen() {
  const {
    running,
    elapsed,
    laps,
    currentLapElapsed,
    bestLap,
    start,
    stop,
    lap,
    reset,
    saveSession,
  } = useLapTimer();
  const { activeTrack } = useTracks();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [notes, setNotes] = useState("");
  const [savedConfirm, setSavedConfirm] = useState(false);

  useEffect(() => {
    if (running) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [running, pulseAnim]);

  const handleSave = useCallback(() => {
    saveSession(trackName || activeTrack?.name || "Unknown Track", activeTrack?.id ?? null, notes || undefined);
    setSavedConfirm(true);
    setTimeout(() => {
      setShowSaveModal(false);
      setSavedConfirm(false);
      setTrackName("");
      setNotes("");
    }, 1200);
  }, [saveSession, trackName, notes, activeTrack]);

  const handleOpenSaveModal = useCallback(() => {
    if (activeTrack && !trackName) setTrackName(activeTrack.name);
    setShowSaveModal(true);
  }, [activeTrack, trackName]);

  const canSave = !running && (laps.length > 0 || elapsed > 0);

  return (
    <>
      <ScrollView style={lapStyles.container} showsVerticalScrollIndicator={false}>
        <View style={lapStyles.clockBlock}>
          <View style={lapStyles.clockHeader}>
            <Animated.View
              style={[
                lapStyles.liveDot,
                { transform: [{ scale: pulseAnim }], opacity: running ? 1 : 0 },
              ]}
            />
            <Text style={lapStyles.clockHeaderText}>
              {running ? "LIVE" : "LAP TIMER"}
            </Text>
          </View>
          <Text style={lapStyles.clockDisplay}>{formatTimeColon(elapsed)}</Text>
          {laps.length > 0 && running && (
            <Text style={lapStyles.currentLap}>
              LAP {laps.length + 1} &nbsp;·&nbsp; {formatTime(currentLapElapsed)}
            </Text>
          )}
          <View style={lapStyles.controls}>
            <TouchableOpacity
              style={[lapStyles.sideBtn, (elapsed === 0 || running) && lapStyles.btnDisabled]}
              onPress={reset}
              disabled={elapsed === 0 || running}
              activeOpacity={0.7}
              testID="lap-timer-reset"
            >
              <RotateCcw size={20} color={elapsed === 0 || running ? "#2a2a2a" : "#888"} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[lapStyles.mainBtn, running && lapStyles.mainBtnStop]}
              onPress={running ? stop : start}
              activeOpacity={0.85}
              testID="lap-timer-main"
            >
              {running ? (
                <Square size={22} fill="#fff" color="#fff" strokeWidth={0} />
              ) : (
                <Play size={24} fill="#000" color="#000" strokeWidth={0} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[lapStyles.sideBtn, !running && lapStyles.btnDisabled]}
              onPress={lap}
              disabled={!running}
              activeOpacity={0.7}
              testID="lap-timer-lap"
            >
              <Flag size={20} color={running ? "#fff" : "#2a2a2a"} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {canSave && (
            <TouchableOpacity
              style={lapStyles.saveBtn}
              onPress={handleOpenSaveModal}
              activeOpacity={0.8}
              testID="save-session-btn"
            >
              <BookmarkPlus size={14} color="#FF1801" strokeWidth={2} />
              <Text style={lapStyles.saveBtnText}>SAVE SESSION</Text>
            </TouchableOpacity>
          )}
        </View>

        {laps.length > 0 && (
          <View style={lapStyles.lapsSection}>
            <View style={lapStyles.lapsHeader}>
              <Text style={lapStyles.lapsTitle}>LAP TIMES</Text>
              {bestLap !== null && (
                <View style={lapStyles.bestBadge}>
                  <TrendingUp size={11} color="#34C759" strokeWidth={2} />
                  <Text style={lapStyles.bestBadgeText}>BEST {formatTime(bestLap)}</Text>
                </View>
              )}
            </View>
            {laps.map((lapMs, i) => {
              const lapNum = laps.length - i;
              const isBest = lapMs === bestLap;
              const isWorst = laps.length > 2 && lapMs === Math.max(...laps);
              return (
                <View key={i} style={[lapStyles.lapRow, isBest && lapStyles.lapRowBest]}>
                  <Text style={lapStyles.lapNum}>L{String(lapNum).padStart(2, "0")}</Text>
                  <Text
                    style={[
                      lapStyles.lapTime,
                      isBest && { color: "#34C759" },
                      isWorst && !isBest && { color: "#FF3B30" },
                    ]}
                  >
                    {formatTime(lapMs)}
                  </Text>
                  {isBest && (
                    <View style={lapStyles.bestPill}>
                      <Text style={lapStyles.bestPillText}>BEST</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSaveModal(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={saveModalStyles.overlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSaveModal(false)} />
          <View style={saveModalStyles.sheet}>
            <View style={saveModalStyles.handle} />
            <View style={saveModalStyles.header}>
              <View style={saveModalStyles.headerLeft}>
                <Timer size={15} color="#FF1801" strokeWidth={2} />
                <Text style={saveModalStyles.headerTitle}>SAVE SESSION</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSaveModal(false)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <X size={20} color="#444" strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={saveModalStyles.summaryRow}>
              <View style={saveModalStyles.summaryCell}>
                <Text style={saveModalStyles.summaryLabel}>LAPS</Text>
                <Text style={saveModalStyles.summaryValue}>{laps.length}</Text>
              </View>
              <View style={saveModalStyles.summaryDivider} />
              <View style={saveModalStyles.summaryCell}>
                <Text style={saveModalStyles.summaryLabel}>BEST LAP</Text>
                <Text style={[saveModalStyles.summaryValue, { color: "#34C759" }]}>
                  {bestLap !== null ? formatTime(bestLap) : "—"}
                </Text>
              </View>
              <View style={saveModalStyles.summaryDivider} />
              <View style={saveModalStyles.summaryCell}>
                <Text style={saveModalStyles.summaryLabel}>TOTAL</Text>
                <Text style={saveModalStyles.summaryValue}>{formatTime(elapsed)}</Text>
              </View>
            </View>

            <View style={saveModalStyles.fieldSection}>
              <Text style={saveModalStyles.fieldLabel}>TRACK</Text>
              <TextInput
                style={saveModalStyles.input}
                value={trackName}
                onChangeText={setTrackName}
                placeholder="Track name..."
                placeholderTextColor="#2a2a2a"
                autoCorrect={false}
                testID="session-track-input"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={saveModalStyles.chipsScroll}
                contentContainerStyle={saveModalStyles.chipsContent}
              >
                {QUICK_TRACKS_SAVE.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[saveModalStyles.chip, trackName === t && saveModalStyles.chipActive]}
                    onPress={() => setTrackName(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[saveModalStyles.chipText, trackName === t && saveModalStyles.chipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={saveModalStyles.fieldSection}>
              <Text style={saveModalStyles.fieldLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[saveModalStyles.input, saveModalStyles.inputMulti]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Conditions, setup, comments..."
                placeholderTextColor="#2a2a2a"
                multiline
                numberOfLines={2}
                testID="session-notes-input"
              />
            </View>

            <TouchableOpacity
              style={[saveModalStyles.saveBtn, savedConfirm && saveModalStyles.saveBtnConfirmed]}
              onPress={handleSave}
              disabled={savedConfirm}
              activeOpacity={0.85}
              testID="confirm-save-session-btn"
            >
              {savedConfirm ? (
                <>
                  <Check size={16} color="#000" strokeWidth={2.5} />
                  <Text style={saveModalStyles.saveBtnText}>SAVED</Text>
                </>
              ) : (
                <>
                  <BookmarkPlus size={16} color="#000" strokeWidth={2} />
                  <Text style={saveModalStyles.saveBtnText}>SAVE SESSION</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const saveModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  sheet: {
    backgroundColor: "#080808",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#222",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 2,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 10,
    padding: 16,
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#1a1a1a",
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  fieldSection: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#FFF",
    letterSpacing: -0.2,
  },
  inputMulti: {
    height: 64,
    textAlignVertical: "top",
  },
  chipsScroll: {
    marginTop: 2,
  },
  chipsContent: {
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#0d0d0d",
  },
  chipActive: {
    borderColor: "#FF1801",
    backgroundColor: "rgba(255,24,1,0.08)",
  },
  chipText: {
    fontSize: 10,
    color: "#444",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FF1801",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 10,
    paddingVertical: 15,
    marginTop: 4,
  },
  saveBtnConfirmed: {
    backgroundColor: "#34C759",
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 1,
  },
});

const lapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  clockBlock: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    gap: 6,
  },
  clockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF1801",
  },
  clockHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  clockDisplay: {
    fontSize: 64,
    fontWeight: "100",
    color: "#FFF",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"] as const,
  },
  currentLap: {
    fontSize: 13,
    color: "#555",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"] as const,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 16,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  mainBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  mainBtnStop: {
    backgroundColor: "#FF1801",
    shadowColor: "#FF1801",
    shadowOpacity: 0.4,
  },
  lapsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 0,
  },
  lapsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  lapsTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52,199,89,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 0.5,
  },
  lapRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
    gap: 16,
  },
  lapRowBest: {
    backgroundColor: "rgba(52,199,89,0.04)",
  },
  lapNum: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
    width: 36,
    fontVariant: ["tabular-nums"] as const,
  },
  lapTime: {
    flex: 1,
    fontSize: 20,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  bestPill: {
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  bestPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#2a0a00",
    backgroundColor: "rgba(255,24,1,0.06)",
    borderRadius: 8,
    paddingVertical: 11,
    marginTop: 8,
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  saveBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 1.5,
  },
});


type PITSubTab = "comms" | "messages" | "log";

function getPriorityColor(priority: MsgPriority): string {
  switch (priority) {
    case "critical": return "#FF1801";
    case "high": return "#FFD600";
    case "normal": return "#FFFFFF";
    case "info": return "#444";
  }
}

function getLogTypeColor(type: PitLogType): string {
  switch (type) {
    case "lap": return "#00FF41";
    case "flag": return "#FFD600";
    case "pit": return "#FF1801";
    case "comms": return "#00B4FF";
    case "system": return "#555";
  }
}

function getLogTypeLabel(type: PitLogType): string {
  switch (type) {
    case "lap": return "LAP";
    case "flag": return "FLAG";
    case "pit": return "PIT";
    case "comms": return "COM";
    case "system": return "SYS";
  }
}

function PITScreen() {
  const {
    hubStatus, isConnected, signalBars, rssi, activeFlag,
    messages, log, voiceLog, unreadCount, isSimulating,
    connectHub, disconnectHub, startSimulate, stopSimulate,
    ackMessage, markRead, logVoiceTX,
  } = usePIT();
  const { laps, currentLapElapsed } = useLapTimer();

  const [subTab, setSubTab] = useState<PITSubTab>("comms");
  const [isPTT, setIsPTT] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [urlInput, setUrlInput] = useState("ws://192.168.4.2:82");
  const pttStartRef = useRef(0);

  const pttScale = useRef(new Animated.Value(1)).current;
  const pttGlow = useRef(new Animated.Value(0)).current;

  const handlePTTIn = useCallback(() => {
    if (!isConnected) return;
    pttStartRef.current = Date.now();
    setIsPTT(true);
    Animated.parallel([
      Animated.spring(pttScale, { toValue: 0.93, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.timing(pttGlow, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [isConnected, pttScale, pttGlow]);

  const handlePTTOut = useCallback(() => {
    if (!isPTT) return;
    const durMs = Date.now() - pttStartRef.current;
    setIsPTT(false);
    logVoiceTX(durMs);
    Animated.parallel([
      Animated.spring(pttScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.timing(pttGlow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [isPTT, pttScale, pttGlow, logVoiceTX]);

  const handleConnect = useCallback(() => {
    connectHub(urlInput.trim() || "ws://192.168.4.2:82");
    setShowConnectModal(false);
  }, [connectHub, urlInput]);

  const signalColor = signalBars >= 3 ? "#34C759" : signalBars >= 2 ? "#FFD600" : signalBars >= 1 ? "#FF3B30" : "#2a2a2a";
  const signalLabelText = ["—", "POOR", "FAIR", "GOOD", "STRONG"][Math.min(signalBars, 4)];

  const connColor = isConnected ? "#34C759" : hubStatus === "connecting" ? "#FF9500" : hubStatus === "error" ? "#FF3B30" : "#333";
  const connLabel = isConnected ? "HUB CONNECTED" : hubStatus === "connecting" ? "CONNECTING..." : hubStatus === "error" ? "HUB ERROR" : "NO HUB SIGNAL";

  const flagColor = activeFlag === "red" ? "#FF1801" : activeFlag === "yellow" ? "#FFD600" : activeFlag === "sc" ? "#FF9500" : activeFlag === "chequered" ? "#EEE" : "#34C759";
  const flagLabelText = activeFlag === "red" ? "RED FLAG" : activeFlag === "yellow" ? "YELLOW" : activeFlag === "sc" ? "SAFETY CAR" : activeFlag === "chequered" ? "CHEQUERED" : "GREEN";

  const lapNum = laps.length;

  return (
    <View style={pitStyles.root}>
      <View style={pitStyles.header}>
        <View style={pitStyles.connStatus}>
          <View style={[pitStyles.connDot, { backgroundColor: connColor }]} />
          <Text style={[pitStyles.connLabel, { color: connColor }]}>{connLabel}</Text>
        </View>
        {isConnected && (
          <View style={pitStyles.signalWrap}>
            <View style={pitStyles.signalBars}>
              {[1, 2, 3, 4].map((level) => (
                <View
                  key={level}
                  style={[
                    pitStyles.signalBar,
                    { height: 4 + level * 3 },
                    signalBars >= level ? { backgroundColor: signalColor } : { backgroundColor: "#1e1e1e" },
                  ]}
                />
              ))}
            </View>
            <Text style={[pitStyles.signalLabel, { color: signalColor }]}>{signalLabelText}</Text>
          </View>
        )}
        <View style={pitStyles.headerBtns}>
          {isSimulating ? (
            <TouchableOpacity style={[pitStyles.headerBtn, pitStyles.headerBtnDanger]} onPress={stopSimulate} activeOpacity={0.75} testID="pit-stop-sim-btn">
              <Text style={[pitStyles.headerBtnText, { color: "#FF3B30" }]}>STOP SIM</Text>
            </TouchableOpacity>
          ) : isConnected ? (
            <TouchableOpacity style={pitStyles.headerBtn} onPress={disconnectHub} activeOpacity={0.75} testID="pit-disconnect-btn">
              <Text style={pitStyles.headerBtnText}>DISCONNECT</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[pitStyles.headerBtn, pitStyles.headerBtnPrimary]}
                onPress={() => setShowConnectModal(true)}
                activeOpacity={0.75}
                testID="pit-connect-btn"
                disabled={hubStatus === "connecting"}
              >
                <Text style={[pitStyles.headerBtnText, { color: hubStatus === "connecting" ? "#555" : "#FFF" }]}>
                  {hubStatus === "connecting" ? "..." : "CONNECT"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[pitStyles.headerBtn, pitStyles.headerBtnSim]} onPress={startSimulate} activeOpacity={0.75} testID="pit-simulate-btn">
                <Text style={[pitStyles.headerBtnText, { color: "#FF9500" }]}>SIMULATE</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {isConnected && (
        <View style={pitStyles.sessionBar}>
          <View style={pitStyles.sessionCell}>
            <Text style={pitStyles.sessionLabel}>LAP</Text>
            <Text style={pitStyles.sessionValue}>{lapNum > 0 ? String(lapNum) : "—"}</Text>
          </View>
          <View style={pitStyles.sessionDivider} />
          <View style={pitStyles.sessionCell}>
            <Text style={pitStyles.sessionLabel}>CURRENT</Text>
            <Text style={pitStyles.sessionValue}>{formatTimeColon(currentLapElapsed)}</Text>
          </View>
          <View style={pitStyles.sessionDivider} />
          <View style={[pitStyles.sessionCell, pitStyles.sessionFlagCell]}>
            <View style={[pitStyles.flagDot, { backgroundColor: flagColor }]} />
            <Text style={[pitStyles.flagLabelText, { color: flagColor }]}>{flagLabelText}</Text>
          </View>
          {rssi !== null && (
            <>
              <View style={pitStyles.sessionDivider} />
              <View style={pitStyles.sessionCell}>
                <Text style={pitStyles.sessionLabel}>RSSI</Text>
                <Text style={[pitStyles.sessionValue, { color: signalColor, fontSize: 11 }]}>{rssi} dBm</Text>
              </View>
            </>
          )}
        </View>
      )}

      <View style={pitStyles.subTabBar}>
        {(["comms", "messages", "log"] as PITSubTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[pitStyles.subTab, subTab === tab && pitStyles.subTabActive]}
            onPress={() => setSubTab(tab)}
            activeOpacity={0.7}
            testID={`pit-subtab-${tab}`}
          >
            <Text style={[pitStyles.subTabText, subTab === tab && pitStyles.subTabTextActive]}>
              {tab === "messages" && unreadCount > 0 ? `MSGS (${unreadCount})` : tab.toUpperCase()}
            </Text>
            {subTab === tab && <View style={pitStyles.subTabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {subTab === "comms" && (
        <View style={pitStyles.commsRoot}>
          <View style={pitStyles.channelRow}>
            <View style={pitStyles.channelCell}>
              <Text style={pitStyles.channelLabel}>CHANNEL</Text>
              <Text style={pitStyles.channelValue}>REYCIN-01</Text>
            </View>
            <View style={pitStyles.channelCell}>
              <Text style={pitStyles.channelLabel}>MODE</Text>
              <Text style={pitStyles.channelValue}>ESP32 MESH</Text>
            </View>
            <View style={[pitStyles.channelCell, pitStyles.channelCellLast]}>
              <Text style={pitStyles.channelLabel}>LATENCY</Text>
              <Text style={[pitStyles.channelValue, { color: isConnected ? "#34C759" : "#333" }]}>
                {isConnected ? "~12ms" : "—"}
              </Text>
            </View>
          </View>

          <View style={pitStyles.pttWrap}>
            <Animated.View style={[pitStyles.pttRing, { opacity: pttGlow, transform: [{ scale: pttScale }] }]} />
            <Animated.View style={[pitStyles.pttOuter, { transform: [{ scale: pttScale }] }]}>
              <TouchableOpacity
                style={[pitStyles.pttButton, isPTT && pitStyles.pttButtonActive, !isConnected && pitStyles.pttButtonDisabled]}
                onPressIn={handlePTTIn}
                onPressOut={handlePTTOut}
                activeOpacity={1}
                disabled={!isConnected}
                testID="pit-ptt-button"
              >
                <Mic size={38} color={isPTT ? "#000" : isConnected ? "#FFF" : "#2a2a2a"} strokeWidth={1.5} />
                <Text style={[pitStyles.pttLabel, isPTT && pitStyles.pttLabelActive, !isConnected && pitStyles.pttLabelDisabled]}>
                  {isPTT ? "TRANSMITTING" : "HOLD TO TALK"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={pitStyles.pttHint}>
              {isConnected ? "Hold to transmit to pit wall" : "Connect to hub to enable comms"}
            </Text>
          </View>

          <View style={pitStyles.voiceLog}>
            <Text style={pitStyles.voiceLogTitle}>RECENT COMMS</Text>
            {voiceLog.length === 0 ? (
              <Text style={pitStyles.emptySmall}>No voice comms yet</Text>
            ) : (
              voiceLog.slice(0, 6).map((entry) => (
                <View key={entry.id} style={pitStyles.voiceRow}>
                  <Text style={pitStyles.voiceTime}>{entry.timestamp}</Text>
                  <View style={[pitStyles.dirBadge, { backgroundColor: entry.direction === "TX" ? "#1a0800" : "#001209" }]}>
                    <Text style={[pitStyles.dirText, { color: entry.direction === "TX" ? "#FF6B00" : "#34C759" }]}>
                      {entry.direction}
                    </Text>
                  </View>
                  <Text style={pitStyles.voiceSender}>{entry.sender}</Text>
                  <Text style={pitStyles.voiceDuration}>{Math.round(entry.durationMs / 1000)}s</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {subTab === "messages" && (
        <ScrollView style={pitStyles.msgScroll} contentContainerStyle={pitStyles.msgContent} showsVerticalScrollIndicator={false}>
          {messages.length === 0 ? (
            <View style={pitStyles.emptyState}>
              <Text style={pitStyles.emptyTitle}>No Messages</Text>
              <Text style={pitStyles.emptySub}>
                {isConnected ? "Messages from the pit wall will appear here" : "Connect to hub to receive pit wall messages"}
              </Text>
            </View>
          ) : (
            messages.map((msg) => (
              <TouchableOpacity
                key={msg.id}
                style={[
                  pitStyles.msgCard,
                  msg.status === "unread" && pitStyles.msgCardUnread,
                  msg.priority === "critical" && pitStyles.msgCardCritical,
                ]}
                onPress={() => markRead(msg.id)}
                activeOpacity={0.8}
                testID={`pit-msg-${msg.id}`}
              >
                <View style={pitStyles.msgCardHeader}>
                  <View style={[pitStyles.priorityBar, { backgroundColor: getPriorityColor(msg.priority) }]} />
                  <View style={pitStyles.msgMeta}>
                    <Text style={[pitStyles.msgCategory, { color: getPriorityColor(msg.priority) }]}>
                      {msg.category.toUpperCase()}
                    </Text>
                    <View style={pitStyles.msgMetaRight}>
                      <Text style={pitStyles.msgSender}>{msg.sender}</Text>
                      <Text style={pitStyles.msgTime}>{msg.timestamp}</Text>
                    </View>
                  </View>
                </View>
                <Text style={[pitStyles.msgText, msg.status === "unread" && pitStyles.msgTextUnread]}>
                  {msg.text}
                </Text>
                <View style={pitStyles.msgFooter}>
                  {msg.status === "acknowledged" ? (
                    <View style={pitStyles.ackedBadge}>
                      <Check size={9} color="#34C759" strokeWidth={2.5} />
                      <Text style={pitStyles.ackedText}>ACKNOWLEDGED</Text>
                    </View>
                  ) : (
                    <TouchableOpacity style={pitStyles.ackBtn} onPress={() => ackMessage(msg.id)} activeOpacity={0.75} testID={`pit-ack-${msg.id}`}>
                      <Text style={pitStyles.ackBtnText}>ACKNOWLEDGE</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {subTab === "log" && (
        <ScrollView style={pitStyles.logScroll} showsVerticalScrollIndicator={false}>
          <View style={pitStyles.logContent}>
            {log.length === 0 ? (
              <View style={pitStyles.emptyState}>
                <Text style={pitStyles.emptyTitle}>No Log Entries</Text>
                <Text style={pitStyles.emptySub}>
                  {isConnected ? "Events will be logged automatically" : "Connect to hub to start logging"}
                </Text>
              </View>
            ) : (
              log.map((entry) => (
                <View key={entry.id} style={pitStyles.logRow} testID={`pit-log-${entry.id}`}>
                  <Text style={pitStyles.logTime}>{entry.timestamp}</Text>
                  <View style={[pitStyles.logTypeBadge, { borderColor: getLogTypeColor(entry.type) + "44" }]}>
                    <Text style={[pitStyles.logTypeText, { color: getLogTypeColor(entry.type) }]}>
                      {getLogTypeLabel(entry.type)}
                    </Text>
                  </View>
                  <Text style={pitStyles.logText} numberOfLines={2}>{entry.text}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={showConnectModal} transparent animationType="slide" onRequestClose={() => setShowConnectModal(false)} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={pitStyles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowConnectModal(false)} />
          <View style={pitStyles.modalSheet}>
            <View style={pitStyles.modalHandle} />
            <Text style={pitStyles.modalTitle}>CONNECT TO HUB</Text>
            <Text style={pitStyles.modalSub}>Enter the Hub WebSocket address. Default is the Hub AP address.</Text>
            <TextInput
              style={pitStyles.modalInput}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="ws://192.168.4.2:82"
              placeholderTextColor="#2a2a2a"
              autoCapitalize="none"
              autoCorrect={false}
              testID="hub-url-input"
            />
            <View style={pitStyles.modalBtns}>
              <TouchableOpacity style={pitStyles.modalCancelBtn} onPress={() => setShowConnectModal(false)} activeOpacity={0.75}>
                <Text style={pitStyles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={pitStyles.modalConnectBtn} onPress={handleConnect} activeOpacity={0.85} testID="hub-connect-confirm-btn">
                <Text style={pitStyles.modalConnectText}>CONNECT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const pitStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    gap: 8,
  },
  connStatus: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  connDot: { width: 7, height: 7, borderRadius: 3.5 },
  connLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  signalWrap: { flexDirection: "row", alignItems: "flex-end", gap: 5 },
  signalBars: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  signalBar: { width: 5, borderRadius: 1.5 },
  signalLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  headerBtns: { flexDirection: "row", gap: 6 },
  headerBtn: {
    borderWidth: 1,
    borderColor: "#1e1e1e",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  headerBtnPrimary: { borderColor: "#2a2a2a", backgroundColor: "#111" },
  headerBtnSim: { borderColor: "#2a1800", backgroundColor: "rgba(255,149,0,0.06)" },
  headerBtnDanger: { borderColor: "#2a0a00", backgroundColor: "rgba(255,59,48,0.06)" },
  headerBtnText: { fontSize: 9, fontWeight: "700", color: "#555", letterSpacing: 1 },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070707",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingVertical: 9,
  },
  sessionCell: { flex: 1, alignItems: "center", gap: 2 },
  sessionFlagCell: { flex: 1.2, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  sessionDivider: { width: 1, height: 24, backgroundColor: "#111" },
  sessionLabel: { fontSize: 8, fontWeight: "700", color: "#2a2a2a", letterSpacing: 1.5 },
  sessionValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#CCC",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.3,
  },
  flagDot: { width: 7, height: 7, borderRadius: 3.5 },
  flagLabelText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  subTabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  subTab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    position: "relative",
  },
  subTabActive: {},
  subTabText: { fontSize: 9, fontWeight: "700", color: "#2a2a2a", letterSpacing: 1.5 },
  subTabTextActive: { color: "#FFF" },
  subTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: "#FF1801",
    borderRadius: 1,
  },
  commsRoot: { flex: 1 },
  channelRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  channelCell: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 3,
    borderRightWidth: 1,
    borderRightColor: "#0d0d0d",
  },
  channelCellLast: { borderRightWidth: 0 },
  channelLabel: { fontSize: 8, fontWeight: "700", color: "#2a2a2a", letterSpacing: 1.5 },
  channelValue: { fontSize: 12, fontWeight: "600", color: "#FFF", letterSpacing: 0.3 },
  pttWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  pttRing: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,24,1,0.12)",
  },
  pttOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080808",
  },
  pttButton: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "#0f0f0f",
    borderWidth: 2,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pttButtonActive: { backgroundColor: "#FF1801", borderColor: "#FF1801" },
  pttButtonDisabled: { borderColor: "#111" },
  pttLabel: { fontSize: 9, fontWeight: "700", color: "#444", letterSpacing: 1.5 },
  pttLabelActive: { color: "#000" },
  pttLabelDisabled: { color: "#1e1e1e" },
  pttHint: { fontSize: 11, color: "#2a2a2a", textAlign: "center", paddingHorizontal: 40 },
  voiceLog: {
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
    padding: 16,
    gap: 11,
  },
  voiceLogTitle: { fontSize: 9, fontWeight: "700", color: "#2a2a2a", letterSpacing: 1.5, marginBottom: 2 },
  emptySmall: { fontSize: 11, color: "#1e1e1e", textAlign: "center", paddingVertical: 8 },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  voiceTime: { fontSize: 11, color: "#2a2a2a", fontVariant: ["tabular-nums"] as const, width: 52 },
  dirBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  dirText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  voiceSender: { fontSize: 12, color: "#CCC", fontWeight: "500", flex: 1 },
  voiceDuration: { fontSize: 10, color: "#333" },
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 14, fontWeight: "600", color: "#1e1e1e" },
  emptySub: { fontSize: 12, color: "#1a1a1a", textAlign: "center", lineHeight: 18 },
  msgScroll: { flex: 1 },
  msgContent: { padding: 12, gap: 10, paddingBottom: 28 },
  msgCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 10,
    overflow: "hidden",
  },
  msgCardUnread: { borderColor: "#251000", backgroundColor: "#0a0600" },
  msgCardCritical: { borderColor: "#3a0800", backgroundColor: "#0d0200" },
  msgCardHeader: { flexDirection: "row" },
  priorityBar: { width: 3 },
  msgMeta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  msgCategory: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5, flex: 1 },
  msgMetaRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  msgSender: { fontSize: 10, color: "#444", fontWeight: "600" },
  msgTime: { fontSize: 10, color: "#333", fontVariant: ["tabular-nums"] as const },
  msgText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    letterSpacing: -0.2,
    paddingHorizontal: 15,
    paddingBottom: 12,
  },
  msgTextUnread: { color: "#EEE", fontWeight: "500" },
  msgFooter: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: 12 },
  ackedBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  ackedText: { fontSize: 9, fontWeight: "700", color: "#34C759", letterSpacing: 1 },
  ackBtn: {
    borderWidth: 1,
    borderColor: "#2a2500",
    backgroundColor: "rgba(255,214,0,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 5,
  },
  ackBtnText: { fontSize: 9, fontWeight: "700", color: "#FFD600", letterSpacing: 1.5 },
  logScroll: { flex: 1 },
  logContent: { padding: 14, gap: 0, paddingBottom: 28 },
  logRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
  },
  logTime: { fontSize: 10, color: "#2a2a2a", fontVariant: ["tabular-nums"] as const, width: 52, paddingTop: 1 },
  logTypeBadge: { borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginTop: 1 },
  logTypeText: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  logText: { flex: 1, fontSize: 12, color: "#666", lineHeight: 17, letterSpacing: -0.1 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.75)" },
  modalSheet: {
    backgroundColor: "#080808",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "#1a1a1a",
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: "#222", borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalTitle: { fontSize: 11, fontWeight: "700", color: "#FFF", letterSpacing: 2 },
  modalSub: { fontSize: 12, color: "#333", lineHeight: 18 },
  modalInput: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#FFF",
    letterSpacing: -0.2,
  },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 12, fontWeight: "700", color: "#444", letterSpacing: 1 },
  modalConnectBtn: {
    flex: 2,
    backgroundColor: "#FFF",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalConnectText: { fontSize: 12, fontWeight: "700", color: "#000", letterSpacing: 1 },
});

const RACE_TABS: { id: RaceTab; label: string; short: string }[] = [
  { id: "dash", label: "Digital Dash", short: "DASH" },
  { id: "timer", label: "Lap Timer", short: "TIMER" },
  { id: "tracks", label: "Tracks", short: "TRACKS" },
  { id: "tuning", label: "Tuning", short: "TUNING" },
  { id: "pit", label: "PIT", short: "PIT" },
  { id: "league", label: "League", short: "LEAGUE" },
];

export default function RaceScreen() {
  const { initialTab } = useLocalSearchParams<{ initialTab?: string }>();
  const [activeTab, setActiveTab] = useState<RaceTab>("dash");

  useEffect(() => {
    if (initialTab && ["dash", "timer", "tracks", "tuning", "pit", "league"].includes(initialTab)) {
      setActiveTab(initialTab as RaceTab);
    }
  }, [initialTab]);
  const [floatData, setFloatData] = useState<FloatData>({
    visible: false,
    track: null,
    coords: [],
  });

  const scrollRef = useRef<ScrollView>(null);

  const handleFloat = useCallback((track: Track, coords: TrackCoordinate[]) => {
    setFloatData({ visible: true, track, coords });
  }, []);

  const handleCloseFloat = useCallback(() => {
    setFloatData({ visible: false, track: null, coords: [] });
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "dash":
        return <DigitalDashScreen />;
      case "timer":
        return <LapTimerScreen />;
      case "tracks":
        return <TracksScreen onFloat={handleFloat} />;
      case "tuning":
        return <TuningConsole />;
      case "pit":
        return <PITScreen />;
      case "league":
        return <LeagueModule />;
    }
  };

  return (
    <View style={mainStyles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={mainStyles.tabBar}
        contentContainerStyle={mainStyles.tabBarContent}
      >
        {RACE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[mainStyles.tab, isActive && mainStyles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              testID={`race-tab-${tab.id}`}
            >
              <Text
                style={[
                  mainStyles.tabText,
                  isActive && mainStyles.tabTextActive,
                ]}
              >
                {tab.short}
              </Text>
              {isActive && <View style={mainStyles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={mainStyles.content}>{renderContent()}</View>

      {floatData.visible && floatData.track && (
        <FloatingMapOverlay
          track={floatData.track}
          coords={floatData.coords}
          onClose={handleCloseFloat}
        />
      )}
    </View>
  );
}

const mainStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  tabBarContent: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: "#FFF",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "#FF1801",
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
});
