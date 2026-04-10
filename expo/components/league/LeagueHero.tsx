import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import type { League } from "@/types/league";

interface LeagueHeroProps {
  league: League;
}

export default function LeagueHero({ league }: LeagueHeroProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.logoContainer}>
        {league.logoUrl ? (
          <Image source={{ uri: league.logoUrl }} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoFallbackText}>
              {league.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {league.name}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.seasonBadge}>
            <Text style={styles.seasonText}>{league.season}</Text>
          </View>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>
        {!!league.description && (
          <Text style={styles.desc} numberOfLines={2}>
            {league.description}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#080808",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,24,1,0.08)",
  },
  logoFallbackText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: -0.5,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  seasonBadge: {
    backgroundColor: "rgba(255,214,0,0.08)",
    borderWidth: 1,
    borderColor: "#2a2200",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  seasonText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD600",
    letterSpacing: 1,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52,199,89,0.08)",
    borderWidth: 1,
    borderColor: "#0a2a10",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#34C759",
  },
  activeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 1,
  },
  desc: {
    fontSize: 11,
    color: "#444",
    lineHeight: 16,
  },
});
