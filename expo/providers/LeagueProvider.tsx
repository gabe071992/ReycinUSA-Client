import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useMemo, useState } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/config/firebase";
import type {
  Driver,
  HpClass,
  League,
  LeagueEvent,
  MediaItem,
  Rule,
  Series,
  Team,
  Vehicle,
} from "@/types/league";

const DB_ROOT = "reycinUSA/works/league";

function parseSnapshot<T extends { id: string }>(
  data: Record<string, unknown> | null
): T[] {
  if (!data) return [];
  return Object.entries(data).map(([id, val]) => ({
    ...(val as Omit<T, "id">),
    id,
  })) as T[];
}

export const [LeagueProvider, useLeague] = createContextHook(() => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [hpClasses, setHpClasses] = useState<HpClass[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [events, setEvents] = useState<LeagueEvent[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    let loadedCount = 0;

    const collections: Array<{
      path: string;
      setter: (items: unknown[]) => void;
    }> = [
      { path: "leagues", setter: (d) => setLeagues(d as League[]) },
      { path: "series", setter: (d) => setSeries(d as Series[]) },
      { path: "hpClasses", setter: (d) => setHpClasses(d as HpClass[]) },
      { path: "teams", setter: (d) => setTeams(d as Team[]) },
      { path: "drivers", setter: (d) => setDrivers(d as Driver[]) },
      { path: "vehicles", setter: (d) => setVehicles(d as Vehicle[]) },
      { path: "events", setter: (d) => setEvents(d as LeagueEvent[]) },
      { path: "rules", setter: (d) => setRules(d as Rule[]) },
      { path: "media", setter: (d) => setMedia(d as MediaItem[]) },
    ];

    const total = collections.length;

    for (const col of collections) {
      const colRef = ref(database, `${DB_ROOT}/${col.path}`);
      const unsub = onValue(
        colRef,
        (snap) => {
          const data = snap.exists()
            ? parseSnapshot(snap.val() as Record<string, unknown>)
            : [];
          col.setter(data);
          loadedCount++;
          if (loadedCount >= total) setLoading(false);
          console.log(`[League] ${col.path} loaded: ${data.length} items`);
        },
        (err) => {
          console.error(`[League] ${col.path} error:`, err);
          setError(`Failed to load ${col.path}`);
          loadedCount++;
          if (loadedCount >= total) setLoading(false);
        }
      );
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((fn) => fn());
      console.log("[League] All listeners detached");
    };
  }, []);

  const driversMap = useMemo<Record<string, Driver>>(
    () => drivers.reduce((acc, d) => ({ ...acc, [d.id]: d }), {}),
    [drivers]
  );

  const teamsMap = useMemo<Record<string, Team>>(
    () => teams.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
    [teams]
  );

  const seriesMap = useMemo<Record<string, Series>>(
    () => series.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}),
    [series]
  );

  return useMemo(
    () => ({
      leagues,
      series,
      hpClasses,
      teams,
      drivers,
      vehicles,
      events,
      rules,
      media,
      loading,
      error,
      driversMap,
      teamsMap,
      seriesMap,
    }),
    [
      leagues, series, hpClasses, teams, drivers, vehicles,
      events, rules, media, loading, error, driversMap, teamsMap, seriesMap,
    ]
  );
});
