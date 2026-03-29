import createContextHook from "@nkzw/create-context-hook";
import { useState, useCallback, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TRACKS_KEY = "reycin_user_tracks_v2";
const ACTIVE_TRACK_KEY = "reycin_active_track_id_v1";

export interface TrackCoordinate {
  latitude: number;
  longitude: number;
}

export interface TrackWaypoint {
  id: string;
  label: string;
  coordinate: TrackCoordinate;
}

export interface Track {
  id: string;
  name: string;
  location: string;
  length_km: number;
  center: TrackCoordinate;
  coordinates: TrackCoordinate[];
  waypoints?: TrackWaypoint[];
  isUserRecorded?: boolean;
  recordedAt?: string;
}

export const [TracksProvider, useTracks] = createContextHook(() => {
  const [userTracks, setUserTracks] = useState<Track[]>([]);
  const [activeTrackId, setActiveTrackIdState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([
      AsyncStorage.getItem(TRACKS_KEY),
      AsyncStorage.getItem(ACTIVE_TRACK_KEY),
    ]).then(([rawTracks, rawActive]) => {
      if (rawTracks) {
        try {
          const parsed = JSON.parse(rawTracks);
          if (Array.isArray(parsed)) {
            setUserTracks(parsed);
            console.log("[Tracks] Loaded", parsed.length, "user tracks");
          }
        } catch (e) {
          console.warn("[Tracks] Failed to parse tracks:", e);
        }
      }
      if (rawActive) {
        setActiveTrackIdState(rawActive);
        console.log("[Tracks] Active track id loaded:", rawActive);
      }
      setLoaded(true);
    });
  }, []);

  const persistTracks = useCallback((tracks: Track[]) => {
    AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(tracks)).catch((e) =>
      console.error("[Tracks] persist error:", e)
    );
  }, []);

  const saveTrack = useCallback(
    (track: Track) => {
      setUserTracks((prev) => {
        const updated = [track, ...prev.filter((t) => t.id !== track.id)];
        persistTracks(updated);
        console.log("[Tracks] Saved track:", track.id, track.name);
        return updated;
      });
    },
    [persistTracks]
  );

  const deleteTrack = useCallback(
    (id: string) => {
      setUserTracks((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        persistTracks(updated);
        console.log("[Tracks] Deleted track:", id);
        return updated;
      });
      setActiveTrackIdState((prev) => {
        if (prev === id) {
          AsyncStorage.removeItem(ACTIVE_TRACK_KEY).catch(console.error);
          return null;
        }
        return prev;
      });
    },
    [persistTracks]
  );

  const renameTrack = useCallback(
    (id: string, name: string) => {
      setUserTracks((prev) => {
        const updated = prev.map((t) => (t.id === id ? { ...t, name } : t));
        persistTracks(updated);
        return updated;
      });
    },
    [persistTracks]
  );

  const addWaypoint = useCallback(
    (trackId: string, waypoint: TrackWaypoint) => {
      setUserTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== trackId) return t;
          return { ...t, waypoints: [...(t.waypoints ?? []), waypoint] };
        });
        persistTracks(updated);
        return updated;
      });
    },
    [persistTracks]
  );

  const removeWaypoint = useCallback(
    (trackId: string, waypointId: string) => {
      setUserTracks((prev) => {
        const updated = prev.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            waypoints: (t.waypoints ?? []).filter((w) => w.id !== waypointId),
          };
        });
        persistTracks(updated);
        return updated;
      });
    },
    [persistTracks]
  );

  const setActiveTrackId = useCallback((id: string | null) => {
    setActiveTrackIdState(id);
    if (id) {
      AsyncStorage.setItem(ACTIVE_TRACK_KEY, id).catch(console.error);
    } else {
      AsyncStorage.removeItem(ACTIVE_TRACK_KEY).catch(console.error);
    }
    console.log("[Tracks] Active track set:", id);
  }, []);

  const activeTrack = useMemo(
    () => userTracks.find((t) => t.id === activeTrackId) ?? null,
    [userTracks, activeTrackId]
  );

  return useMemo(
    () => ({
      userTracks,
      activeTrack,
      activeTrackId,
      setActiveTrackId,
      saveTrack,
      deleteTrack,
      renameTrack,
      addWaypoint,
      removeWaypoint,
      loaded,
    }),
    [
      userTracks,
      activeTrack,
      activeTrackId,
      setActiveTrackId,
      saveTrack,
      deleteTrack,
      renameTrack,
      addWaypoint,
      removeWaypoint,
      loaded,
    ]
  );
});
