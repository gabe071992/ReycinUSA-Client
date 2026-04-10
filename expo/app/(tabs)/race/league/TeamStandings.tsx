import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Wrench } from "lucide-react-native";
import StandingsRow from "@/components/league/StandingsRow";
import { useLeague } from "@/providers/LeagueProvider";
import { computeTeamStandings } from "@/types/league";

interface TeamStandingsProps {
  seriesId: string;
}

export default function TeamStandings({ seriesId }: TeamStandingsProps) {
  const { events, driversMap, teamsMap } = useLeague();

  const standings = useMemo(
    () => computeTeamStandings(events, driversMap, seriesId),
    [events, driversMap, seriesId]
  );

  if (standings.length === 0) {
    return (
      <View style={styles.empty}>
        <Wrench size={36} color="#1a1a1a" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptySub}>
          Team standings will appear after race results are recorded.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={standings}
      keyExtractor={(item) => item.teamId}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.tableHeader}>
          <View style={{ width: 30 }} />
          <Text style={[styles.headerText, { flex: 1, paddingLeft: 10 }]}>TEAM</Text>
          <View style={styles.headerStatGroup}>
            <Text style={styles.headerStatText}>W</Text>
            <Text style={styles.headerStatText}>POD</Text>
            <Text style={styles.headerStatText}>DNF</Text>
          </View>
          <Text style={[styles.headerText, { minWidth: 50, textAlign: "right" }]}>PTS</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const team = teamsMap[item.teamId];
        const teamName = team ? team.name : `Team #${item.teamId.slice(-4)}`;
        const subLabel = team ? `${team.city}, ${team.state}`.replace(/, $/, "").trim() : undefined;

        return (
          <StandingsRow
            rank={index + 1}
            name={teamName}
            subLabel={subLabel !== ", " ? subLabel : undefined}
            points={item.points}
            bonusPoints={item.bonusPoints}
            wins={item.wins}
            podiums={item.podiums}
            dnfs={item.dnfs}
          />
        );
      }}
      ListFooterComponent={
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Team points = driver points + per-event bonuses (FL +3, Pole +2, Both Top10 +5, All Finish +3, Clean +3)
          </Text>
          <View style={{ height: 24 }} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 0 },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    backgroundColor: "#050505",
  },
  headerText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  headerStatGroup: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  headerStatText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
    minWidth: 24,
    textAlign: "center",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 48,
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  footerNote: {
    fontSize: 10,
    color: "#222",
    lineHeight: 16,
    fontStyle: "italic" as const,
  },
});
