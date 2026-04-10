import React from "react";
import { View, Text, StyleSheet } from "react-native";
import BonusIcon from "@/components/league/BonusIcon";
import type { EventResult, Driver, Vehicle } from "@/types/league";

interface ResultRowProps {
  result: EventResult;
  driver?: Driver;
  vehicle?: Vehicle;
  rank: number;
}

const MEDAL_COLORS: Record<number, string> = {
  1: "#FFD600",
  2: "#B0B8C4",
  3: "#C4834A",
};

export default function ResultRow({ result, driver, vehicle, rank }: ResultRowProps) {
  const medalColor = MEDAL_COLORS[rank];
  const driverName = driver
    ? `${driver.firstName} ${driver.lastName}`
    : `Driver #${result.driverId.slice(-4)}`;
  const vehicleLabel =
    vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : null;

  return (
    <View style={[styles.row, result.dnf && styles.rowDnf]}>
      <View style={[styles.posBadge, medalColor ? { borderColor: medalColor } : null]}>
        <Text style={[styles.posText, medalColor ? { color: medalColor } : null]}>
          {result.dnf ? "DNF" : rank}
        </Text>
      </View>

      <View style={styles.driverInfo}>
        <View style={styles.nameRow}>
          {driver?.number !== undefined && (
            <View style={styles.carNum}>
              <Text style={styles.carNumText}>#{driver.number}</Text>
            </View>
          )}
          <Text style={styles.driverName} numberOfLines={1}>
            {driverName}
          </Text>
          {driver?.nickname ? (
            <Text style={styles.nickname} numberOfLines={1}>
              "{driver.nickname}"
            </Text>
          ) : null}
        </View>
        {vehicleLabel && (
          <Text style={styles.vehicleText} numberOfLines={1}>
            {vehicleLabel}
          </Text>
        )}
        {!!result.penalty && (
          <Text style={styles.penalty}>{result.penalty}</Text>
        )}
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.time}>{result.time || (result.dnf ? "—" : "—")}</Text>
        {result.laps > 0 && (
          <Text style={styles.laps}>{result.laps} laps</Text>
        )}
        <BonusIcon
          polePosition={result.polePosition}
          fastestLap={result.fastestLap}
          mostPositionsGained={result.mostPositionsGained}
          cleanRace={result.cleanRace}
        />
      </View>

      <View style={styles.pointsBadge}>
        <Text style={styles.pointsText}>{result.points}</Text>
        <Text style={styles.ptLabel}>PTS</Text>
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
  rowDnf: {
    opacity: 0.45,
  },
  posBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  posText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    fontVariant: ["tabular-nums"] as const,
  },
  driverInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  carNum: {
    backgroundColor: "#FF1801",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  carNumText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 0.5,
  },
  driverName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  nickname: {
    fontSize: 11,
    color: "#444",
    fontStyle: "italic" as const,
  },
  vehicleText: {
    fontSize: 11,
    color: "#333",
  },
  penalty: {
    fontSize: 10,
    color: "#FF6B35",
    fontStyle: "italic" as const,
  },
  rightCol: {
    alignItems: "flex-end",
    gap: 3,
    flexShrink: 0,
  },
  time: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.3,
  },
  laps: {
    fontSize: 10,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  pointsBadge: {
    width: 40,
    alignItems: "center",
    gap: 1,
    flexShrink: 0,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  ptLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
  },
});
