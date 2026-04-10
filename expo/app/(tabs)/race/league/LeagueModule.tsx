import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import LeagueHome from "@/app/(tabs)/race/league/LeagueHome";
import SeriesDetail from "@/app/(tabs)/race/league/SeriesDetail";
import EventResults from "@/app/(tabs)/race/league/EventResults";

type LeagueView =
  | { screen: "home" }
  | { screen: "series"; seriesId: string; leagueId: string }
  | { screen: "event"; eventId: string; seriesId: string; leagueId: string };

export default function LeagueModule() {
  const [view, setView] = useState<LeagueView>({ screen: "home" });

  const goHome = useCallback(() => {
    setView({ screen: "home" });
  }, []);

  const goSeries = useCallback((seriesId: string, leagueId: string) => {
    setView({ screen: "series", seriesId, leagueId });
    console.log("[LeagueModule] Navigate → series:", seriesId);
  }, []);

  const goEvent = useCallback(
    (eventId: string) => {
      if (view.screen === "series") {
        setView({
          screen: "event",
          eventId,
          seriesId: view.seriesId,
          leagueId: view.leagueId,
        });
        console.log("[LeagueModule] Navigate → event:", eventId);
      }
    },
    [view]
  );

  const goBackFromEvent = useCallback(() => {
    if (view.screen === "event") {
      setView({
        screen: "series",
        seriesId: view.seriesId,
        leagueId: view.leagueId,
      });
    }
  }, [view]);

  return (
    <View style={styles.root}>
      {view.screen === "home" && (
        <LeagueHome onSelectSeries={goSeries} />
      )}

      {view.screen === "series" && (
        <SeriesDetail
          seriesId={view.seriesId}
          leagueId={view.leagueId}
          onBack={goHome}
          onSelectEvent={goEvent}
        />
      )}

      {view.screen === "event" && (
        <EventResults eventId={view.eventId} onBack={goBackFromEvent} />
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
