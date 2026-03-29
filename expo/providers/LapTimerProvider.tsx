import createContextHook from "@nkzw/create-context-hook";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface RaceSession {
  id: string;
  trackId: string | null;
  trackName: string;
  date: string;
  timeOfDay: string;
  laps: number[];
  totalTime: number;
  bestLap: number | null;
  notes?: string;
}

const SESSIONS_KEY = "reycin_race_sessions_v1";

export const [LapTimerProvider, useLapTimer] = createContextHook(() => {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [savedSessions, setSavedSessions] = useState<RaceSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const lapStartRef = useRef(0);
  const lapsRef = useRef<number[]>([]);
  const elapsedRef = useRef(0);

  useEffect(() => { lapsRef.current = laps; }, [laps]);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  useEffect(() => {
    void AsyncStorage.getItem(SESSIONS_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSavedSessions(parsed);
        } catch (e) {
          console.warn("[LapTimer] Failed to parse sessions:", e);
        }
      }
      setSessionsLoaded(true);
      console.log("[LapTimer] Sessions loaded from storage");
    });
  }, []);

  const persistSessions = useCallback((sessions: RaceSession[]) => {
    setSavedSessions(sessions);
    AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)).catch((e) =>
      console.error("[LapTimer] Failed to persist sessions:", e)
    );
  }, []);

  const start = useCallback(() => {
    const now = Date.now();
    const lapsTotal = lapsRef.current.reduce((a, b) => a + b, 0);
    startRef.current = now - elapsedRef.current;
    lapStartRef.current = now - (elapsedRef.current - lapsTotal);
    setRunning(true);
    console.log("[LapTimer] Started");
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 50);
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log("[LapTimer] Stopped, elapsed:", elapsedRef.current);
  }, []);

  const lap = useCallback(() => {
    const now = Date.now();
    const lapTime = now - lapStartRef.current;
    lapStartRef.current = now;
    setLaps((prev) => [lapTime, ...prev]);
    console.log("[LapTimer] Lap recorded:", lapTime);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    startRef.current = 0;
    lapStartRef.current = 0;
    console.log("[LapTimer] Reset");
  }, []);

  const saveSession = useCallback(
    (trackName: string, trackId: string | null, notes?: string): RaceSession | null => {
      const currentLaps = lapsRef.current;
      const currentElapsed = elapsedRef.current;
      if (currentLaps.length === 0 && currentElapsed === 0) {
        console.warn("[LapTimer] Nothing to save");
        return null;
      }

      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");

      // laps stored reversed (newest first), reverse back for chronological order
      const chronoLaps = [...currentLaps].reverse();
      const bestLap = chronoLaps.length > 0 ? Math.min(...chronoLaps) : null;

      const session: RaceSession = {
        id: `session-${Date.now()}`,
        trackId,
        trackName: trackName.trim() || "Unknown Track",
        date: now.toISOString(),
        timeOfDay: `${hours}:${minutes}`,
        laps: chronoLaps,
        totalTime: currentElapsed,
        bestLap,
        notes: notes?.trim() || undefined,
      };

      setSavedSessions((prev) => {
        const updated = [session, ...prev];
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)).catch((e) =>
          console.error("[LapTimer] Failed to persist sessions:", e)
        );
        return updated;
      });

      console.log("[LapTimer] Session saved:", session.id, "laps:", chronoLaps.length);
      return session;
    },
    []
  );

  const deleteSession = useCallback(
    (id: string) => {
      const updated = savedSessions.filter((s) => s.id !== id);
      persistSessions(updated);
      console.log("[LapTimer] Session deleted:", id);
    },
    [savedSessions, persistSessions]
  );

  const lapsTotal = laps.reduce((a, b) => a + b, 0);
  const currentLapElapsed = elapsed - lapsTotal;
  const bestLap = laps.length > 0 ? Math.min(...laps) : null;
  const lastLap = laps.length > 0 ? laps[0] : null;

  return useMemo(
    () => ({
      running,
      elapsed,
      laps,
      currentLapElapsed,
      bestLap,
      lastLap,
      savedSessions,
      sessionsLoaded,
      start,
      stop,
      lap,
      reset,
      saveSession,
      deleteSession,
    }),
    [
      running,
      elapsed,
      laps,
      currentLapElapsed,
      bestLap,
      lastLap,
      savedSessions,
      sessionsLoaded,
      start,
      stop,
      lap,
      reset,
      saveSession,
      deleteSession,
    ]
  );
});
