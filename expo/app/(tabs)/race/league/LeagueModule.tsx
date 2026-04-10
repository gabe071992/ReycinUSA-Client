import React, { useCallback, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import LeagueHome from "@/app/(tabs)/race/league/LeagueHome";
import SeriesDetail from "@/app/(tabs)/race/league/SeriesDetail";
import EventResults from "@/app/(tabs)/race/league/EventResults";
import TeamProfile from "@/app/(tabs)/race/league/TeamProfile";
import DriverProfile from "@/app/(tabs)/race/league/DriverProfile";
import WatchScreen from "@/app/(tabs)/race/league/WatchScreen";
import RulesBrowser from "@/app/(tabs)/race/league/RulesBrowser";
import { useState } from "react";

type NavEntry =
  | { screen: "home" }
  | { screen: "series"; seriesId: string; leagueId: string }
  | { screen: "event"; eventId: string; seriesId: string; leagueId: string }
  | { screen: "team"; teamId: string }
  | { screen: "driver"; driverId: string }
  | { screen: "watch"; leagueId: string }
  | { screen: "rules"; seriesId: string };

export default function LeagueModule() {
  const [stack, setStack] = useState<NavEntry[]>([{ screen: "home" }]);

  const current = stack[stack.length - 1] ?? { screen: "home" as const };

  const push = useCallback((entry: NavEntry) => {
    console.log("[LeagueModule] push →", entry.screen);
    setStack((prev) => [...prev, entry]);
  }, []);

  const pop = useCallback(() => {
    setStack((prev) => {
      if (prev.length <= 1) return prev;
      console.log("[LeagueModule] pop ←", prev[prev.length - 2]?.screen);
      return prev.slice(0, -1);
    });
  }, []);

  const goHome = useCallback(() => {
    setStack([{ screen: "home" }]);
  }, []);

  const handleSelectSeries = useCallback(
    (seriesId: string, leagueId: string) => {
      push({ screen: "series", seriesId, leagueId });
    },
    [push]
  );

  const handleSelectEvent = useCallback(
    (eventId: string, seriesId: string, leagueId: string) => {
      push({ screen: "event", eventId, seriesId, leagueId });
    },
    [push]
  );

  const handleSelectTeam = useCallback(
    (teamId: string) => {
      push({ screen: "team", teamId });
    },
    [push]
  );

  const handleSelectDriver = useCallback(
    (driverId: string) => {
      push({ screen: "driver", driverId });
    },
    [push]
  );

  const handleSelectWatch = useCallback(
    (leagueId: string) => {
      push({ screen: "watch", leagueId });
    },
    [push]
  );

  const handleSelectRules = useCallback(
    (seriesId: string) => {
      push({ screen: "rules", seriesId });
    },
    [push]
  );

  const seriesLeagueId = useMemo(() => {
    if (current.screen === "event") return current.leagueId;
    if (current.screen === "series") return current.leagueId;
    return "";
  }, [current]);

  const seriesSeriesId = useMemo(() => {
    if (current.screen === "event") return current.seriesId;
    if (current.screen === "series") return current.seriesId;
    return "";
  }, [current]);

  return (
    <View style={styles.root}>
      {current.screen === "home" && (
        <LeagueHome
          onSelectSeries={handleSelectSeries}
          onSelectWatch={handleSelectWatch}
        />
      )}

      {current.screen === "series" && (
        <SeriesDetail
          seriesId={current.seriesId}
          leagueId={current.leagueId}
          onBack={pop}
          onSelectEvent={(eventId) =>
            handleSelectEvent(eventId, current.seriesId, current.leagueId)
          }
          onSelectDriver={handleSelectDriver}
          onSelectTeam={handleSelectTeam}
          onSelectRules={handleSelectRules}
        />
      )}

      {current.screen === "event" && (
        <EventResults eventId={current.eventId} onBack={pop} />
      )}

      {current.screen === "team" && (
        <TeamProfile
          teamId={current.teamId}
          onBack={pop}
          onSelectDriver={handleSelectDriver}
        />
      )}

      {current.screen === "driver" && (
        <DriverProfile
          driverId={current.driverId}
          onBack={pop}
          onSelectTeam={handleSelectTeam}
        />
      )}

      {current.screen === "watch" && (
        <WatchScreen leagueId={current.leagueId} onBack={pop} />
      )}

      {current.screen === "rules" && (
        <RulesBrowser seriesId={current.seriesId} onBack={pop} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
});
