import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Trophy, Tv2 } from "lucide-react-native";
import LeagueHero from "@/components/league/LeagueHero";
import SeriesCard from "@/components/league/SeriesCard";
import { useLeague } from "@/providers/LeagueProvider";

interface LeagueHomeProps {
  onSelectSeries: (seriesId: string, leagueId: string) => void;
  onSelectWatch?: (leagueId: string) => void;
}

export default function LeagueHome({
  onSelectSeries,
  onSelectWatch,
}: LeagueHomeProps) {
  const { leagues, series, events, media, loading, error } = useLeague();

  const activeLeagues = useMemo(
    () => leagues.filter((l) => l.status === "active"),
    [leagues]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF1801" />
        <Text style={styles.loadingText}>LOADING CHAMPIONSHIP DATA</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Trophy size={36} color="#2a2a2a" strokeWidth={1.5} />
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    );
  }

  if (activeLeagues.length === 0) {
    return (
      <View style={styles.center}>
        <Trophy size={40} color="#1a1a1a" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No Active Leagues</Text>
        <Text style={styles.emptySub}>
          Check back when a new championship season goes live.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderIcon}>
          <Trophy size={14} color="#FFD600" strokeWidth={2} />
        </View>
        <Text style={styles.pageHeaderText}>ARC CHAMPIONSHIP</Text>
      </View>

      {activeLeagues.map((league) => {
        const leagueSeries = series.filter((s) => s.leagueId === league.id);
        const hasVideos = media.some(
          (m) => m.leagueId === league.id && m.type === "video"
        );

        return (
          <View key={league.id} style={styles.leagueBlock}>
            <LeagueHero league={league} />

            {onSelectWatch && (
              <TouchableOpacity
                style={styles.watchBtn}
                onPress={() => onSelectWatch(league.id)}
                activeOpacity={0.75}
                testID={`watch-btn-${league.id}`}
              >
                <View style={styles.watchIconWrap}>
                  <Tv2 size={12} color="#FF1801" strokeWidth={2} />
                </View>
                <Text style={styles.watchBtnText}>LEAGUES LIBRARY</Text>
                {hasVideos && <View style={styles.watchDot} />}
              </TouchableOpacity>
            )}

            {leagueSeries.length === 0 ? (
              <View style={styles.noSeries}>
                <Text style={styles.noSeriesText}>No series configured</Text>
              </View>
            ) : (
              leagueSeries.map((s) => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  events={events}
                  onPress={() => onSelectSeries(s.id, league.id)}
                />
              ))
            )}
          </View>
        );
      })}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 2,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF4444",
    marginTop: 8,
  },
  errorSub: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
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
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  pageHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "rgba(255,214,0,0.08)",
    borderWidth: 1,
    borderColor: "#2a2200",
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFD600",
    letterSpacing: 2,
  },
  leagueBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "rgba(255,24,1,0.05)",
    borderWidth: 1,
    borderColor: "#2a0a0a",
    borderRadius: 9,
  },
  watchIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "rgba(255,24,1,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  watchBtnText: {
    flex: 1,
    fontSize: 10,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 1.5,
  },
  watchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF1801",
  },
  noSeries: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  noSeriesText: {
    fontSize: 12,
    color: "#2a2a2a",
    fontStyle: "italic",
  },
});
