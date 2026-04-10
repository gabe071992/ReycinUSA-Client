import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface BonusIconProps {
  polePosition?: boolean;
  fastestLap?: boolean;
  mostPositionsGained?: boolean;
  cleanRace?: boolean;
}

export default function BonusIcon({
  polePosition,
  fastestLap,
  mostPositionsGained,
  cleanRace,
}: BonusIconProps) {
  const icons: string[] = [];
  if (polePosition) icons.push("🏁");
  if (fastestLap) icons.push("⚡");
  if (mostPositionsGained) icons.push("📈");
  if (cleanRace) icons.push("🧹");

  if (icons.length === 0) return null;

  return (
    <View style={styles.row}>
      {icons.map((icon, i) => (
        <Text key={i} style={styles.icon}>
          {icon}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  icon: {
    fontSize: 11,
  },
});
