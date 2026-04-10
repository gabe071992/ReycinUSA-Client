import React, { createContext, useContext, useEffect, useState } from "react";
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

interface LeagueContextValue {
  leagues: League[];
  series: Series[];
  hpClasses: HpClass[];
  teams: Team[];
  drivers: Driver[];
  vehicles: Vehicle[];
  events: LeagueEvent[];
  rules: Rule[];
  media: MediaItem[];
  loading: boolean;
  error: string | null;
  driversMap: Record<string, Driver>;
  teamsMap: Record<string, Team>;
  seriesMap: Record<string, Series>;
}

const LeagueContext = createContext<LeagueContextValue | undefined>(undefined);

export function LeagueProvider({ children }: { children: React.ReactNode }) {
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
    let unsubscribers: Array<() => void> = [];
    let mounted = true;

    const initListeners = async () => {
      try {
        const { database } = await import("@/config/firebase");
        const { ref, onValue } = await import("firebase/database");

        const collections: Array<{
          path: string;
          setter: (items: unknown[]) => void;
        }> = [
          { path: "leagues", setter: (d) => mounted && setLeagues(d as League[]) },
          { path: "series", setter: (d) => mounted && setSeries(d as Series[]) },
          { path: "hpClasses", setter: (d) => mounted && setHpClasses(d as HpClass[]) },
          { path: "teams", setter: (d) => mounted && setTeams(d as Team[]) },
          { path: "drivers", setter: (d) => mounted && setDrivers(d as Driver[]) },
          { path: "vehicles", setter: (d) => mounted && setVehicles(d as Vehicle[]) },
          { path: "events", setter: (d) => mounted && setEvents(d as LeagueEvent[]) },
          { path: "rules", setter: (d) => mounted && setRules(d as Rule[]) },
          { path: "media", setter: (d) => mounted && setMedia(d as MediaItem[]) },
        ];

        let loadedCount = 0;
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
              if (mounted && loadedCount >= total) setLoading(false);
              console.log(`[League] ${col.path} loaded: ${data.length} items`);
            },
            (err) => {
              console.error(`[League] ${col.path} listener error:`, err);
              if (mounted) {
                setError(`Failed to load ${col.path}`);
                loadedCount++;
                if (loadedCount >= total) setLoading(false);
              }
            }
          );
          unsubscribers.push(unsub);
        }
      } catch (err) {
        console.error("[League] Init error:", err);
        if (mounted) {
          setError("Failed to connect to League database");
          setLoading(false);
        }
      }
    };

    void initListeners();

    return () => {
      mounted = false;
      unsubscribers.forEach((fn) => fn());
      console.log("[League] All listeners detached");
    };
  }, []);

  const driversMap: Record<string, Driver> = drivers.reduce(
    (acc, d) => ({ ...acc, [d.id]: d }),
    {}
  );
  const teamsMap: Record<string, Team> = teams.reduce(
    (acc, t) => ({ ...acc, [t.id]: t }),
    {}
  );
  const seriesMap: Record<string, Series> = series.reduce(
    (acc, s) => ({ ...acc, [s.id]: s }),
    {}
  );

  const value: LeagueContextValue = {
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
  };

  return (
    <LeagueContext.Provider value={value}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error("useLeague must be used within LeagueProvider");
  return ctx;
}
