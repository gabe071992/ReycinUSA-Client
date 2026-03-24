import React, { useState, useRef, useCallback, useEffect } from "react";
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
import { useOBD } from "@/providers/OBDProvider";
import { useLapTimer } from "@/providers/LapTimerProvider";

type RaceTab = "dash" | "timer" | "tracks" | "tuning" | "pit";

interface TrackCoordinate {
  latitude: number;
  longitude: number;
}

interface Track {
  id: string;
  name: string;
  location: string;
  length_km: number;
  center: TrackCoordinate;
  coordinates: TrackCoordinate[];
  isUserRecorded?: boolean;
  recordedAt?: string;
}



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
  onPress,
}: {
  track: Track;
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
        <View style={trackListStyles.iconDot}>
          <MapPin size={13} color="#FF1801" strokeWidth={2} />
        </View>
        <View style={trackListStyles.cardInfo}>
          <Text style={trackListStyles.cardName} numberOfLines={1}>
            {track.name}
          </Text>
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
  const [listMode, setListMode] = useState<"known" | "mine">("known");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCoords, setRecordedCoords] = useState<TrackCoordinate[]>([]);
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [submitSent, setSubmitSent] = useState<string | null>(null);

  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const recordStartRef = useRef(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<LeafletMapHandle>(null);

  useEffect(() => {
    return () => {
      if (watcherRef.current) watcherRef.current.remove();
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (Platform.OS === "web") {
      setLocationError("GPS track recording requires the mobile app.");
      return;
    }
    setLocationError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError("Location permission is required to record a track.");
      return;
    }
    setRecordedCoords([]);
    setRecordElapsed(0);
    recordStartRef.current = Date.now();
    setIsRecording(true);

    elapsedRef.current = setInterval(() => {
      setRecordElapsed(Date.now() - recordStartRef.current);
    }, 500);

    watcherRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 3,
      },
      (loc) => {
        const coord: TrackCoordinate = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setRecordedCoords((prev) => {
          const next = [...prev, coord];
          if (next.length > 1 && mapRef.current) {
            mapRef.current.update(next, next[next.length - 1]);
          }
          return next;
        });
      }
    );
  }, []);

  const stopRecording = useCallback(() => {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    setIsRecording(false);

    setRecordedCoords((coords) => {
      if (coords.length > 2) {
        const newTrack: Track = {
          id: `user-${Date.now()}`,
          name: `Track Recording ${new Date().toLocaleDateString()}`,
          location: "User Recorded",
          length_km: estimateLength(coords),
          center: coords[Math.floor(coords.length / 2)],
          coordinates: [...coords],
          isUserRecorded: true,
          recordedAt: new Date().toISOString(),
        };
        setUserTracks((prev) => [newTrack, ...prev]);
        setSelectedTrack(newTrack);
        setShowMap(true);
        setListMode("mine");
      }
      return coords;
    });
  }, []);

  const handleSelectTrack = useCallback((track: Track) => {
    setSelectedTrack(track);
    setShowMap(true);
  }, []);

  const handleBack = useCallback(() => {
    setShowMap(false);
    setSelectedTrack(null);
  }, []);

  const handleFloat = useCallback(() => {
    if (!selectedTrack) return;
    onFloat(selectedTrack, selectedTrack.coordinates);
  }, [selectedTrack, onFloat]);

  const handleSubmit = useCallback((trackId: string) => {
    setSubmitSent(trackId);
    setTimeout(() => setSubmitSent(null), 3000);
  }, []);

  if (isRecording) {
    const liveCenter =
      recordedCoords.length > 0
        ? recordedCoords[recordedCoords.length - 1]
        : { latitude: 36.5844, longitude: -121.7547 };

    return (
      <View style={recStyles.root}>
        <View style={recStyles.topBar}>
          <View style={recStyles.recBadge}>
            <View style={recStyles.recDot} />
            <Text style={recStyles.recLabel}>RECORDING</Text>
          </View>
          <Text style={recStyles.recTime}>{formatElapsed(recordElapsed)}</Text>
          <Text style={recStyles.recPts}>{recordedCoords.length} pts</Text>
        </View>
        <LeafletMapView
          ref={mapRef}
          center={liveCenter}
          zoom={16}
          coordinates={[]}
          interactive={false}
          style={recStyles.map}
        />
        <View style={recStyles.bottomBar}>
          <View style={recStyles.statsRow}>
            <View style={recStyles.statCell}>
              <Text style={recStyles.statLabel}>DISTANCE</Text>
              <Text style={recStyles.statValue}>
                {estimateLength(recordedCoords).toFixed(2)} km
              </Text>
            </View>
            <View style={recStyles.statDiv} />
            <View style={recStyles.statCell}>
              <Text style={recStyles.statLabel}>POINTS</Text>
              <Text style={recStyles.statValue}>{recordedCoords.length}</Text>
            </View>
            <View style={recStyles.statDiv} />
            <View style={recStyles.statCell}>
              <Text style={recStyles.statLabel}>TIME</Text>
              <Text style={recStyles.statValue}>
                {formatElapsed(recordElapsed)}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={recStyles.stopBtn}
            onPress={stopRecording}
            activeOpacity={0.8}
            testID="stop-recording-btn"
          >
            <Square size={16} fill="#000" color="#000" strokeWidth={0} />
            <Text style={recStyles.stopBtnText}>STOP RECORDING</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showMap && selectedTrack) {


    return (
      <View style={mapViewStyles.root}>
        <View style={mapViewStyles.topBar}>
          <TouchableOpacity
            style={mapViewStyles.backBtn}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Text style={mapViewStyles.backText}>← BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={mapViewStyles.floatBtn}
            onPress={handleFloat}
            activeOpacity={0.7}
            testID="float-map-btn"
          >
            <Maximize2 size={13} color="#FF1801" strokeWidth={2} />
            <Text style={mapViewStyles.floatBtnText}>FLOAT</Text>
          </TouchableOpacity>
        </View>
        <LeafletMapView
          center={selectedTrack.center}
          zoom={14}
          coordinates={selectedTrack.coordinates}
          markerCoordinate={selectedTrack.coordinates.length === 0 ? selectedTrack.center : undefined}
          interactive={true}
          style={mapViewStyles.map}
        />
        <View style={mapViewStyles.infoCard}>
          <View style={mapViewStyles.infoRow}>
            <View style={mapViewStyles.infoMain}>
              <Text style={mapViewStyles.infoName}>{selectedTrack.name}</Text>
              <Text style={mapViewStyles.infoMeta}>
                {selectedTrack.location}
                {"  ·  "}
                {selectedTrack.length_km} km
              </Text>
              {selectedTrack.coordinates.length === 0 && (
                <Text style={mapViewStyles.noDataNote}>
                  Boundary data not yet available — record or import to map outline
                </Text>
              )}
            </View>
            {selectedTrack.isUserRecorded && (
              <TouchableOpacity
                style={[
                  mapViewStyles.submitBtn,
                  submitSent === selectedTrack.id && mapViewStyles.submitBtnSent,
                ]}
                onPress={() => handleSubmit(selectedTrack.id)}
                activeOpacity={0.75}
                testID="submit-track-btn"
              >
                {submitSent === selectedTrack.id ? (
                  <Text style={mapViewStyles.submitBtnText}>SENT ✓</Text>
                ) : (
                  <>
                    <Send size={11} color="#FF1801" strokeWidth={2} />
                    <Text style={mapViewStyles.submitBtnText}>SUBMIT</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={tracksStyles.root}>
      <View style={tracksStyles.segmentBar}>
        <TouchableOpacity
          style={[
            tracksStyles.segment,
            listMode === "known" && tracksStyles.segmentActive,
          ]}
          onPress={() => setListMode("known")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              tracksStyles.segmentText,
              listMode === "known" && tracksStyles.segmentTextActive,
            ]}
          >
            TRACK LIBRARY
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            tracksStyles.segment,
            listMode === "mine" && tracksStyles.segmentActive,
          ]}
          onPress={() => setListMode("mine")}
          activeOpacity={0.7}
        >
          <Text
            style={[
              tracksStyles.segmentText,
              listMode === "mine" && tracksStyles.segmentTextActive,
            ]}
          >
            MY TRACKS
            {userTracks.length > 0 && (
              <Text style={tracksStyles.countBadge}> {userTracks.length}</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>

      {listMode === "known" && (
        <FlatList
          data={KNOWN_TRACKS}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackCard track={item} onPress={() => handleSelectTrack(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}

      {listMode === "mine" && (
        <ScrollView showsVerticalScrollIndicator={false}>
          {locationError && (
            <View style={tracksStyles.errorBanner}>
              <Text style={tracksStyles.errorText}>{locationError}</Text>
            </View>
          )}
          <TouchableOpacity
            style={tracksStyles.recordCta}
            onPress={startRecording}
            activeOpacity={0.8}
            testID="start-recording-btn"
          >
            <View style={tracksStyles.recordCtaIcon}>
              <Navigation size={18} color="#FF1801" strokeWidth={2} />
            </View>
            <View style={tracksStyles.recordCtaText}>
              <Text style={tracksStyles.recordCtaTitle}>Record New Track</Text>
              <Text style={tracksStyles.recordCtaSub}>
                Uses device GPS to map boundary — start/stop from app
              </Text>
            </View>
            <Plus size={18} color="#FF1801" strokeWidth={2} />
          </TouchableOpacity>

          {userTracks.length === 0 && (
            <View style={tracksStyles.emptyState}>
              <BookmarkPlus size={32} color="#1a1a1a" strokeWidth={1.5} />
              <Text style={tracksStyles.emptyTitle}>No Recorded Tracks</Text>
              <Text style={tracksStyles.emptySub}>
                Drive your circuit and tap Record to map it. Recorded tracks can be submitted to the Reycin team for refinement.
              </Text>
            </View>
          )}

          {userTracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              onPress={() => handleSelectTrack(track)}
            />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
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
  },
  errorText: {
    fontSize: 12,
    color: "#FF4444",
    textAlign: "center",
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
    saveSession(trackName || "Unknown Track", null, notes || undefined);
    setSavedConfirm(true);
    setTimeout(() => {
      setShowSaveModal(false);
      setSavedConfirm(false);
      setTrackName("");
      setNotes("");
    }, 1200);
  }, [saveSession, trackName, notes]);

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
              onPress={() => setShowSaveModal(true)}
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
type MsgPriority = "critical" | "high" | "normal" | "info";
type MsgCategory = "strategy" | "instruction" | "reminder" | "warning" | "info";
type MsgStatus = "unread" | "read" | "acknowledged";
type PitLogType = "lap" | "flag" | "pit" | "comms" | "system";

interface PitMessage {
  id: string;
  timestamp: string;
  priority: MsgPriority;
  category: MsgCategory;
  text: string;
  status: MsgStatus;
  sender: string;
}

interface PitLogEntry {
  id: string;
  timestamp: string;
  type: PitLogType;
  text: string;
}

const INITIAL_PIT_MESSAGES: PitMessage[] = [];

const INITIAL_PIT_LOG: PitLogEntry[] = [];

function PITScreen() {
  const [subTab, setSubTab] = useState<PITSubTab>("comms");
  const [messages, setMessages] = useState<PitMessage[]>(INITIAL_PIT_MESSAGES);
  const [pitLog] = useState<PitLogEntry[]>(INITIAL_PIT_LOG);
  const [isPTT, setIsPTT] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [signalStrength, setSignalStrength] = useState(3);

  const pttScale = useRef(new Animated.Value(1)).current;
  const pttGlow = useRef(new Animated.Value(0)).current;

  const unreadCount = messages.filter((m) => m.status === "unread").length;

  useEffect(() => {
    const interval = setInterval(() => {
      setSignalStrength((prev) => {
        const drift = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return Math.min(4, Math.max(0, prev + drift));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePTTIn = useCallback(() => {
    setIsPTT(true);
    Animated.parallel([
      Animated.spring(pttScale, { toValue: 0.93, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.timing(pttGlow, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [pttScale, pttGlow]);

  const handlePTTOut = useCallback(() => {
    setIsPTT(false);
    Animated.parallel([
      Animated.spring(pttScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      Animated.timing(pttGlow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [pttScale, pttGlow]);

  const handleAck = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: "acknowledged" as MsgStatus } : m))
    );
  }, []);

  const handleRead = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.status === "unread" ? { ...m, status: "read" as MsgStatus } : m))
    );
  }, []);

  const getPriorityColor = (priority: MsgPriority): string => {
    switch (priority) {
      case "critical": return "#FF1801";
      case "high": return "#FFD600";
      case "normal": return "#FFFFFF";
      case "info": return "#444";
    }
  };

  const getLogTypeColor = (type: PitLogType): string => {
    switch (type) {
      case "lap": return "#00FF41";
      case "flag": return "#FFD600";
      case "pit": return "#FF1801";
      case "comms": return "#00B4FF";
      case "system": return "#444";
    }
  };

  const getLogTypeLabel = (type: PitLogType): string => {
    switch (type) {
      case "lap": return "LAP";
      case "flag": return "FLAG";
      case "pit": return "PIT";
      case "comms": return "COM";
      case "system": return "SYS";
    }
  };

  const signalBars = [1, 2, 3, 4];
  const signalColor = signalStrength >= 3 ? "#34C759" : signalStrength >= 2 ? "#FFD600" : "#FF1801";
  const signalLabel = ["—", "POOR", "FAIR", "GOOD", "STRONG"][signalStrength];

  return (
    <View style={pitStyles.root}>
      <View style={pitStyles.header}>
        <View style={pitStyles.connStatus}>
          <View style={[pitStyles.connDot, { backgroundColor: isConnected ? "#34C759" : "#2a2a2a" }]} />
          <Text style={[pitStyles.connLabel, { color: isConnected ? "#34C759" : "#333" }]}>
            {isConnected ? "HUB CONNECTED" : "NO HUB SIGNAL"}
          </Text>
        </View>
        <View style={pitStyles.signalWrap}>
          <View style={pitStyles.signalBars}>
            {signalBars.map((level) => (
              <View
                key={level}
                style={[
                  pitStyles.signalBar,
                  { height: 4 + level * 3 },
                  signalStrength >= level
                    ? { backgroundColor: signalColor }
                    : { backgroundColor: "#1e1e1e" },
                ]}
              />
            ))}
          </View>
          <Text style={[pitStyles.signalLabel, { color: isConnected ? signalColor : "#2a2a2a" }]}>
            {isConnected ? signalLabel : "——"}
          </Text>
        </View>
        <TouchableOpacity
          style={[pitStyles.simBtn, isConnected && pitStyles.simBtnActive]}
          onPress={() => setIsConnected((v) => !v)}
          activeOpacity={0.75}
          testID="pit-connect-btn"
        >
          <Text style={[pitStyles.simBtnText, isConnected && pitStyles.simBtnTextActive]}>
            {isConnected ? "DISCONNECT" : "SIMULATE"}
          </Text>
        </TouchableOpacity>
      </View>

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
            <Animated.View
              style={[
                pitStyles.pttRing,
                {
                  opacity: pttGlow,
                  transform: [{ scale: pttScale }],
                },
              ]}
            />
            <Animated.View style={[pitStyles.pttOuter, { transform: [{ scale: pttScale }] }]}>
              <TouchableOpacity
                style={[pitStyles.pttButton, isPTT && pitStyles.pttButtonActive]}
                onPressIn={handlePTTIn}
                onPressOut={handlePTTOut}
                activeOpacity={1}
                testID="pit-ptt-button"
              >
                <Mic size={38} color={isPTT ? "#000" : isConnected ? "#FFF" : "#333"} strokeWidth={1.5} />
                <Text style={[pitStyles.pttLabel, isPTT && pitStyles.pttLabelActive]}>
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
            {([] as { time: string; dir: string; sender: string; note: string }[]).map((entry, i) => (
              <View key={i} style={pitStyles.voiceRow}>
                <Text style={pitStyles.voiceTime}>{entry.time}</Text>
                <View
                  style={[
                    pitStyles.dirBadge,
                    { backgroundColor: entry.dir === "TX" ? "#1a0800" : "#001209" },
                  ]}
                >
                  <Text
                    style={[
                      pitStyles.dirText,
                      { color: entry.dir === "TX" ? "#FF6B00" : "#34C759" },
                    ]}
                  >
                    {entry.dir}
                  </Text>
                </View>
                <Text style={pitStyles.voiceSender}>{entry.sender}</Text>
                <Text style={pitStyles.voiceDuration}>{entry.note}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {subTab === "messages" && (
        <ScrollView
          style={pitStyles.msgScroll}
          contentContainerStyle={pitStyles.msgContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <TouchableOpacity
              key={msg.id}
              style={[
                pitStyles.msgCard,
                msg.status === "unread" && pitStyles.msgCardUnread,
                msg.priority === "critical" && pitStyles.msgCardCritical,
              ]}
              onPress={() => handleRead(msg.id)}
              activeOpacity={0.8}
              testID={`pit-msg-${msg.id}`}
            >
              <View style={pitStyles.msgCardHeader}>
                <View
                  style={[
                    pitStyles.priorityBar,
                    { backgroundColor: getPriorityColor(msg.priority) },
                  ]}
                />
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
              <Text
                style={[
                  pitStyles.msgText,
                  msg.status === "unread" && pitStyles.msgTextUnread,
                ]}
              >
                {msg.text}
              </Text>
              <View style={pitStyles.msgFooter}>
                {msg.status === "acknowledged" ? (
                  <View style={pitStyles.ackedBadge}>
                    <Check size={9} color="#34C759" strokeWidth={2.5} />
                    <Text style={pitStyles.ackedText}>ACKNOWLEDGED</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={pitStyles.ackBtn}
                    onPress={() => handleAck(msg.id)}
                    activeOpacity={0.75}
                    testID={`pit-ack-${msg.id}`}
                  >
                    <Text style={pitStyles.ackBtnText}>ACKNOWLEDGE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {subTab === "log" && (
        <ScrollView style={pitStyles.logScroll} showsVerticalScrollIndicator={false}>
          <View style={pitStyles.logContent}>
            {pitLog.map((entry) => (
              <View key={entry.id} style={pitStyles.logRow} testID={`pit-log-${entry.id}`}>
                <Text style={pitStyles.logTime}>{entry.timestamp}</Text>
                <View
                  style={[
                    pitStyles.logTypeBadge,
                    { borderColor: getLogTypeColor(entry.type) + "44" },
                  ]}
                >
                  <Text style={[pitStyles.logTypeText, { color: getLogTypeColor(entry.type) }]}>
                    {getLogTypeLabel(entry.type)}
                  </Text>
                </View>
                <Text style={pitStyles.logText} numberOfLines={2}>
                  {entry.text}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
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
    gap: 10,
  },
  connStatus: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  connDot: { width: 7, height: 7, borderRadius: 3.5 },
  connLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1.5 },
  signalWrap: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  signalBars: { flexDirection: "row", alignItems: "flex-end", gap: 3 },
  signalBar: { width: 5, borderRadius: 1.5 },
  signalLabel: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  simBtn: {
    borderWidth: 1,
    borderColor: "#1e1e1e",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  simBtnActive: {
    borderColor: "#0a2a00",
    backgroundColor: "rgba(52,199,89,0.06)",
  },
  simBtnText: { fontSize: 9, fontWeight: "700", color: "#333", letterSpacing: 1 },
  simBtnTextActive: { color: "#34C759" },
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
  pttButtonActive: {
    backgroundColor: "#FF1801",
    borderColor: "#FF1801",
  },
  pttLabel: { fontSize: 9, fontWeight: "700", color: "#444", letterSpacing: 1.5 },
  pttLabelActive: { color: "#000" },
  pttHint: { fontSize: 11, color: "#2a2a2a", textAlign: "center", paddingHorizontal: 40 },
  voiceLog: {
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
    padding: 16,
    gap: 11,
  },
  voiceLogTitle: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2a2a2a",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  voiceTime: {
    fontSize: 11,
    color: "#2a2a2a",
    fontVariant: ["tabular-nums"] as const,
    width: 52,
  },
  dirBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  dirText: { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  voiceSender: { fontSize: 12, color: "#CCC", fontWeight: "500", flex: 1 },
  voiceDuration: { fontSize: 10, color: "#333" },
  msgScroll: { flex: 1 },
  msgContent: { padding: 12, gap: 10, paddingBottom: 28 },
  msgCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 10,
    overflow: "hidden",
  },
  msgCardUnread: {
    borderColor: "#251000",
    backgroundColor: "#0a0600",
  },
  msgCardCritical: {
    borderColor: "#3a0800",
    backgroundColor: "#0d0200",
  },
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
  msgTime: {
    fontSize: 10,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  msgText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    letterSpacing: -0.2,
    paddingHorizontal: 15,
    paddingBottom: 12,
  },
  msgTextUnread: { color: "#EEE", fontWeight: "500" },
  msgFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
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
  logTime: {
    fontSize: 10,
    color: "#2a2a2a",
    fontVariant: ["tabular-nums"] as const,
    width: 52,
    paddingTop: 1,
  },
  logTypeBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 1,
  },
  logTypeText: { fontSize: 8, fontWeight: "700", letterSpacing: 1 },
  logText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    lineHeight: 17,
    letterSpacing: -0.1,
  },
});

const RACE_TABS: { id: RaceTab; label: string; short: string }[] = [
  { id: "dash", label: "Digital Dash", short: "DASH" },
  { id: "timer", label: "Lap Timer", short: "TIMER" },
  { id: "tracks", label: "Tracks", short: "TRACKS" },
  { id: "tuning", label: "Tuning", short: "TUNING" },
  { id: "pit", label: "PIT", short: "PIT" },
];

export default function RaceScreen() {
  const [activeTab, setActiveTab] = useState<RaceTab>("dash");
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
