import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface StandingsRowProps {
  rank: number;
  name: string;
  subLabel?: string;
  points: number;
  bonusPoints?: number;
  wins?: number;
  podiums?: number;
  dnfs?: number;
  isHighlighted?: boolean;
}

const MEDAL: Record<number, string> = { 1: "#FFD600", 2: "#B0B8C4", 3: "#C4834A" };

export default function StandingsRow({
  rank,
  name,
  subLabel,
  points,
  bonusPoints,
  wins,
  podiums,
  dnfs,
  isHighlighted,
}: StandingsRowProps) {
  const medalColor = MEDAL[rank];

  return (
    <View style={[styles.row, isHighlighted && styles.rowHighlighted]}>
      <View
        style={[
          styles.rankBadge,
          medalColor ? { borderColor: medalColor } : null,
        ]}
      >
        <Text
          style={[styles.rankText, medalColor ? { color: medalColor } : null]}
        >
          {rank}
        </Text>
      </View>

      <View style={styles.nameCol}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {!!subLabel && (
          <Text style={styles.sub} numberOfLines={1}>
            {subLabel}
          </Text>
        )}
      </View>

      <View style={styles.statsCol}>
        {wins !== undefined && (
          <View style={styles.statCell}>
            <Text style={styles.statVal}>{wins}</Text>
            <Text style={styles.statLbl}>W</Text>
          </View>
        )}
        {podiums !== undefined && (
          <View style={styles.statCell}>
            <Text style={styles.statVal}>{podiums}</Text>
            <Text style={styles.statLbl}>POD</Text>
          </View>
        )}
        {dnfs !== undefined && (
          <View style={styles.statCell}>
            <Text style={[styles.statVal, dnfs > 0 && styles.dnfText]}>
              {dnfs}
            </Text>
            <Text style={styles.statLbl}>DNF</Text>
          </View>
        )}
      </View>

      <View style={styles.pointsCol}>
        <Text style={styles.points}>{points}</Text>
        {!!bonusPoints && bonusPoints > 0 && (
          <View style={styles.bonusChip}>
            <Text style={styles.bonusText}>+{bonusPoints}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
  },
  rowHighlighted: {
    backgroundColor: "rgba(255,24,1,0.04)",
  },
  rankBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
    fontVariant: ["tabular-nums"] as const,
  },
  nameCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  sub: {
    fontSize: 10,
    color: "#444",
  },
  statsCol: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  statCell: {
    alignItems: "center",
    gap: 1,
    minWidth: 24,
  },
  statVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    fontVariant: ["tabular-nums"] as const,
  },
  dnfText: {
    color: "#FF4444",
  },
  statLbl: {
    fontSize: 8,
    fontWeight: "700",
    color: "#2a2a2a",
    letterSpacing: 0.5,
  },
  pointsCol: {
    alignItems: "flex-end",
    gap: 3,
    flexShrink: 0,
    minWidth: 50,
  },
  points: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  bonusChip: {
    backgroundColor: "rgba(52,199,89,0.12)",
    borderWidth: 1,
    borderColor: "#0a2a10",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  bonusText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 0.5,
  },
});
