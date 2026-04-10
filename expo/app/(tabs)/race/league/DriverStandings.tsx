import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Award } from "lucide-react-native";
import StandingsRow from "@/components/league/StandingsRow";
import { useLeague } from "@/providers/LeagueProvider";
import { computeDriverStandings } from "@/types/league";

interface DriverStandingsProps {
  seriesId: string;
}

export default function DriverStandings({ seriesId }: DriverStandingsProps) {
  const { events, driversMap, teamsMap } = useLeague();

  const standings = useMemo(
    () => computeDriverStandings(events, seriesId),
    [events, seriesId]
  );

  if (standings.length === 0) {
    return (
      <View style={styles.empty}>
        <Award size={36} color="#1a1a1a" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No Data Yet</Text>
        <Text style={styles.emptySub}>
          Standings will populate after races are completed.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={standings}
      keyExtractor={(item) => item.driverId}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.tableHeader}>
          <View style={{ width: 30 }} />
          <Text style={[styles.headerText, { flex: 1, paddingLeft: 10 }]}>DRIVER</Text>
          <View style={styles.headerStatGroup}>
            <Text style={styles.headerStatText}>W</Text>
            <Text style={styles.headerStatText}>POD</Text>
            <Text style={styles.headerStatText}>DNF</Text>
          </View>
          <Text style={[styles.headerText, { minWidth: 50, textAlign: "right" }]}>PTS</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const driver = driversMap[item.driverId];
        const team = driver ? teamsMap[driver.teamId] : undefined;
        const driverName = driver
          ? `${driver.firstName} ${driver.lastName}`
          : `Driver #${item.driverId.slice(-4)}`;
        const subLabel = team ? team.name : undefined;

        return (
          <StandingsRow
            rank={index + 1}
            name={driverName}
            subLabel={subLabel}
            points={item.points}
            bonusPoints={item.bonusPoints}
            wins={item.wins}
            podiums={item.podiums}
            dnfs={item.dnfs}
          />
        );
      }}
      ListFooterComponent={<View style={{ height: 24 }} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
  },
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
});
