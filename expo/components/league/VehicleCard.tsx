import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import type { Vehicle, HpClass } from "@/types/league";

interface VehicleCardProps {
  vehicle: Vehicle;
  hpClass?: HpClass;
}

export default function VehicleCard({ vehicle, hpClass }: VehicleCardProps) {
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  return (
    <View style={styles.card} testID={`vehicle-card-${vehicle.id}`}>
      <View style={styles.photoWrap}>
        {vehicle.photoUrl ? (
          <Image
            source={{ uri: vehicle.photoUrl }}
            style={styles.photo}
            contentFit="cover"
          />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.photoFallbackText}>NO PHOTO</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{vehicle.hp}</Text>
            <Text style={styles.statLbl}>HP</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{vehicle.weight}</Text>
            <Text style={styles.statLbl}>LBS</Text>
          </View>
        </View>

        {hpClass && (
          <View style={styles.classPill}>
            <Text style={styles.classText}>{hpClass.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  photoWrap: {
    flexShrink: 0,
  },
  photo: {
    width: 72,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#111",
  },
  photoFallback: {
    width: 72,
    height: 52,
    borderRadius: 8,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  photoFallbackText: {
    fontSize: 7,
    fontWeight: "700",
    color: "#222",
    letterSpacing: 1,
  },
  info: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  statVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#CCC",
    fontVariant: ["tabular-nums"] as const,
  },
  statLbl: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: "#1e1e1e",
  },
  classPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(74,144,217,0.08)",
    borderWidth: 1,
    borderColor: "#0d1f30",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  classText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#4A90D9",
    letterSpacing: 0.5,
  },
});
