import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import type { Driver } from "@/types/league";

interface DriverCardProps {
  driver: Driver;
  onPress?: () => void;
}

const LICENSE_COLORS: Record<string, string> = {
  elite: "#FFD600",
  pro: "#FF1801",
  "semi-pro": "#4A90D9",
  amateur: "#34C759",
  novice: "#555",
};

export default function DriverCard({ driver, onPress }: DriverCardProps) {
  const licenseColor = LICENSE_COLORS[driver.licenseClass] ?? "#555";
  const fullName = `${driver.firstName} ${driver.lastName}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={!onPress}
      testID={`driver-card-${driver.id}`}
    >
      <View style={styles.avatarWrap}>
        {driver.photoUrl ? (
          <Image
            source={{ uri: driver.photoUrl }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>
              {driver.firstName[0] ?? ""}
              {driver.lastName[0] ?? ""}
            </Text>
          </View>
        )}
        <View style={styles.numBadge}>
          <Text style={styles.numText}>#{driver.number}</Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {fullName}
        </Text>
        {!!driver.nickname && (
          <Text style={styles.nickname} numberOfLines={1}>
            &quot;{driver.nickname}&quot;
          </Text>
        )}
        <View
          style={[styles.licensePill, { borderColor: licenseColor + "40" }]}
        >
          <View style={[styles.licenseDot, { backgroundColor: licenseColor }]} />
          <Text style={[styles.licenseText, { color: licenseColor }]}>
            {driver.licenseClass.toUpperCase()}
          </Text>
        </View>
      </View>

      {onPress && (
        <Text style={styles.chevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#111",
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
  },
  numBadge: {
    position: "absolute",
    bottom: -4,
    right: -6,
    backgroundColor: "#FF1801",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#000",
  },
  numText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 0.3,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  nickname: {
    fontSize: 11,
    color: "#444",
    fontStyle: "italic",
  },
  licensePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#0a0a0a",
  },
  licenseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  licenseText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  chevron: {
    fontSize: 18,
    color: "#333",
    marginRight: 2,
    flexShrink: 0,
  },
});
