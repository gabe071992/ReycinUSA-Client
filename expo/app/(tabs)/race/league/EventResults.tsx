import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Calendar, MapPin, ArrowLeft } from "lucide-react-native";
import ResultRow from "@/components/league/ResultRow";
import { useLeague } from "@/providers/LeagueProvider";
import type { EventResult } from "@/types/league";

interface EventResultsProps {
  eventId: string;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#34C759",
  live: "#FF1801",
  scheduled: "#4A90D9",
  cancelled: "#555",
};

export default function EventResults({ eventId, onBack }: EventResultsProps) {
  const { events, driversMap } = useLeague();

  const event = useMemo(
    () => events.find((e) => e.id === eventId) ?? null,
    [events, eventId]
  );

  const sortedResults = useMemo<EventResult[]>(() => {
    if (!event) return [];
    return [...(event.results ?? [])].sort((a, b) => {
      if (a.dnf && !b.dnf) return 1;
      if (!a.dnf && b.dnf) return -1;
      return a.position - b.position;
    });
  }, [event]);

  const dateFormatted = event?.date
    ? new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";

  if (!event) {
    return (
      <View style={styles.root}>
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7} testID="event-results-back">
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Event not found</Text>
        </View>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[event.status] ?? "#555";
  const finishers = sortedResults.filter((r) => !r.dnf).length;
  const dnfs = sortedResults.filter((r) => r.dnf).length;
  const fastestLapResult = sortedResults.find((r) => r.fastestLap);
  const fastestLapDriver = fastestLapResult
    ? driversMap[fastestLapResult.driverId]
    : null;

  return (
    <View style={styles.root}>
      <FlatList
        data={sortedResults}
        keyExtractor={(_, i) => `result-${i}`}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <TouchableOpacity
              style={styles.backRow}
              onPress={onBack}
              activeOpacity={0.7}
              testID="event-results-back"
            >
              <ArrowLeft size={14} color="#555" strokeWidth={2} />
              <Text style={styles.backText}>BACK TO SCHEDULE</Text>
            </TouchableOpacity>

            <View style={styles.eventHeader}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {event.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.eventName}>{event.name}</Text>
              <View style={styles.metaRow}>
                <Calendar size={12} color="#444" strokeWidth={2} />
                <Text style={styles.metaText}>{dateFormatted}</Text>
              </View>
              <View style={styles.metaRow}>
                <MapPin size={12} color="#444" strokeWidth={2} />
                <Text style={styles.metaText}>{event.location || "TBD"}</Text>
              </View>
            </View>

            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{sortedResults.length}</Text>
                <Text style={styles.statLbl}>STARTERS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{finishers}</Text>
                <Text style={styles.statLbl}>FINISHERS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={[styles.statItem]}>
                <Text style={[styles.statNum, dnfs > 0 && styles.dnfColor]}>{dnfs}</Text>
                <Text style={styles.statLbl}>DNF</Text>
              </View>
            </View>

            {fastestLapDriver && (
              <View style={styles.fastestLapBanner}>
                <Text style={styles.flLabel}>⚡ FASTEST LAP</Text>
                <Text style={styles.flDriver}>
                  {fastestLapDriver.firstName} {fastestLapDriver.lastName}
                  {fastestLapResult?.time ? ` · ${fastestLapResult.time}` : ""}
                </Text>
              </View>
            )}

            <View style={styles.bonusLegend}>
              {(["🏁 Pole", "⚡ Fast Lap", "📈 Positions Gained", "🧹 Clean Race"] as const).map(
                (label, i) => (
                  <Text key={i} style={styles.legendItem}>{label}</Text>
                )
              )}
            </View>

            <View style={styles.resultsHeader}>
              <View style={{ width: 32 }} />
              <Text style={[styles.colHead, { flex: 1, paddingLeft: 10 }]}>DRIVER</Text>
              <Text style={[styles.colHead, { textAlign: "right", minWidth: 70 }]}>TIME</Text>
              <Text style={[styles.colHead, { textAlign: "right", minWidth: 40 }]}>PTS</Text>
            </View>
          </>
        }
        renderItem={({ item, index }) => {
          const driver = driversMap[item.driverId];
          return (
            <ResultRow
              result={item}
              driver={driver}
              rank={index + 1}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.noResultsText}>
              Results will appear here once the race is completed.
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  backText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1.5,
  },
  eventHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  eventName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#555",
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#080808",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#111",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  statLbl: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  dnfColor: {
    color: "#FF4444",
  },
  fastestLapBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "rgba(255,214,0,0.04)",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1600",
    gap: 8,
  },
  flLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD600",
    letterSpacing: 1,
  },
  flDriver: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  bonusLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
  },
  legendItem: {
    fontSize: 10,
    color: "#2a2a2a",
    fontWeight: "500",
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    backgroundColor: "#050505",
  },
  colHead: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  notFoundText: {
    fontSize: 14,
    color: "#333",
  },
  noResultsText: {
    fontSize: 13,
    color: "#2a2a2a",
    textAlign: "center",
    lineHeight: 20,
  },
});
