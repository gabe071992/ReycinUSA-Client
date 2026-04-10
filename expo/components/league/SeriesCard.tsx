import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronRight, Flag } from "lucide-react-native";
import type { Series, LeagueEvent } from "@/types/league";

interface SeriesCardProps {
  series: Series;
  events: LeagueEvent[];
  onPress: () => void;
}

export default function SeriesCard({ series, events, onPress }: SeriesCardProps) {
  const upcoming = events.filter((e) => e.seriesId === series.id && e.status === "scheduled");
  const completed = events.filter((e) => e.seriesId === series.id && e.status === "completed");
  const hasLive = events.some((e) => e.seriesId === series.id && e.status === "live");

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      testID={`series-card-${series.id}`}
    >
      <View style={styles.iconWrap}>
        <Flag size={16} color="#FF1801" strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {series.name}
          </Text>
          {hasLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>
        {!!series.description && (
          <Text style={styles.desc} numberOfLines={2}>
            {series.description}
          </Text>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{upcoming.length}</Text>
            <Text style={styles.statLabel}>UPCOMING</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{completed.length}</Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>
          <View style={styles.statDiv} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{upcoming.length + completed.length}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={16} color="#2a2a2a" strokeWidth={2} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,24,1,0.07)",
    borderWidth: 1,
    borderColor: "#1a0800",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,24,1,0.1)",
    borderWidth: 1,
    borderColor: "#2a0800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF1801",
  },
  liveText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 1,
  },
  desc: {
    fontSize: 11,
    color: "#444",
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  stat: {
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 6,
    marginRight: 6,
  },
  statNum: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 1,
  },
  statDiv: {
    display: "none",
  },
});
