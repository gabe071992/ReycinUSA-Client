import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, Shield } from "lucide-react-native";
import { useLeague } from "@/providers/LeagueProvider";
import { computeDriverStandings } from "@/types/league";

interface DriverProfileProps {
  driverId: string;
  onBack: () => void;
  onSelectTeam: (teamId: string) => void;
}

const LICENSE_COLORS: Record<string, string> = {
  elite: "#FFD600",
  pro: "#FF1801",
  "semi-pro": "#4A90D9",
  amateur: "#34C759",
  novice: "#555",
};

const LICENSE_LABELS: Record<string, string> = {
  elite: "ELITE",
  pro: "PRO",
  "semi-pro": "SEMI-PRO",
  amateur: "AMATEUR",
  novice: "NOVICE",
};

export default function DriverProfile({
  driverId,
  onBack,
  onSelectTeam,
}: DriverProfileProps) {
  const { driversMap, teamsMap, events } = useLeague();

  const driver = driversMap[driverId];
  const team = driver ? teamsMap[driver.teamId] : undefined;

  const allStandings = useMemo(
    () => computeDriverStandings(events),
    [events]
  );

  const stats = useMemo(
    () => allStandings.find((s) => s.driverId === driverId),
    [allStandings, driverId]
  );

  const licenseColor =
    driver ? (LICENSE_COLORS[driver.licenseClass] ?? "#555") : "#555";
  const licenseLabel =
    driver ? (LICENSE_LABELS[driver.licenseClass] ?? driver.licenseClass.toUpperCase()) : "";

  if (!driver) {
    return (
      <View style={styles.root}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={onBack}
          activeOpacity={0.7}
          testID="driver-profile-back"
        >
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Driver not found</Text>
        </View>
      </View>
    );
  }

  const fullName = `${driver.firstName} ${driver.lastName}`;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          style={styles.backRow}
          onPress={onBack}
          activeOpacity={0.7}
          testID="driver-profile-back"
        >
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <View style={styles.photoWrap}>
            {driver.photoUrl ? (
              <Image
                source={{ uri: driver.photoUrl }}
                style={styles.photo}
                contentFit="cover"
              />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoInitials}>
                  {driver.firstName[0] ?? ""}
                  {driver.lastName[0] ?? ""}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroRight}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>#{driver.number}</Text>
            </View>
            <Text style={styles.driverName}>{fullName}</Text>
            {!!driver.nickname && (
              <Text style={styles.nickname}>
                &quot;{driver.nickname}&quot;
              </Text>
            )}
            <View
              style={[
                styles.licenseBadge,
                {
                  borderColor: licenseColor + "40",
                  backgroundColor: licenseColor + "10",
                },
              ]}
            >
              <Shield size={10} color={licenseColor} strokeWidth={2} />
              <Text style={[styles.licenseText, { color: licenseColor }]}>
                {licenseLabel}
              </Text>
            </View>
          </View>
        </View>

        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionLabel}>CAREER STATS</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{stats.points}</Text>
                <Text style={styles.statLbl}>POINTS</Text>
                {stats.bonusPoints > 0 && (
                  <View style={styles.bonusChip}>
                    <Text style={styles.bonusChipText}>
                      +{stats.bonusPoints} BONUS
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{stats.wins}</Text>
                <Text style={styles.statLbl}>WINS</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{stats.podiums}</Text>
                <Text style={styles.statLbl}>PODIUMS</Text>
              </View>
              <View style={[styles.statCard, stats.dnfs > 0 && styles.statCardDanger]}>
                <Text style={[styles.statBig, stats.dnfs > 0 && styles.statBigDanger]}>
                  {stats.dnfs}
                </Text>
                <Text style={styles.statLbl}>DNF</Text>
              </View>
            </View>
          </View>
        )}

        {!!driver.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.sectionLabel}>BIO</Text>
            <Text style={styles.bioText}>{driver.bio}</Text>
          </View>
        )}

        {team && (
          <View style={styles.teamSection}>
            <Text style={styles.sectionLabel}>TEAM</Text>
            <TouchableOpacity
              style={styles.teamCard}
              onPress={() => onSelectTeam(team.id)}
              activeOpacity={0.75}
              testID={`driver-team-link-${team.id}`}
            >
              {team.logoUrl ? (
                <Image
                  source={{ uri: team.logoUrl }}
                  style={styles.teamLogo}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.teamLogoFallback}>
                  <Text style={styles.teamLogoInitials}>
                    {team.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{team.name}</Text>
                {!!(team.city || team.state) && (
                  <Text style={styles.teamLocation}>
                    {[team.city, team.state].filter(Boolean).join(", ")}
                  </Text>
                )}
              </View>
              <Text style={styles.teamChevron}>›</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  content: { paddingBottom: 20 },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  notFoundText: { fontSize: 14, color: "#333" },
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
  heroSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  photoWrap: { flexShrink: 0 },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#111",
  },
  photoFallback: {
    width: 80,
    height: 80,
    borderRadius: 14,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  photoInitials: {
    fontSize: 24,
    fontWeight: "800",
    color: "#333",
    letterSpacing: 2,
  },
  heroRight: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  numberBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FF1801",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  numberText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"] as const,
  },
  driverName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  nickname: {
    fontSize: 12,
    color: "#444",
    fontStyle: "italic",
  },
  licenseBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  licenseText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  statsSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statCardDanger: {
    borderColor: "#2a0a0a",
    backgroundColor: "rgba(255,24,1,0.04)",
  },
  statBig: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -1,
  },
  statBigDanger: {
    color: "#FF4444",
  },
  statLbl: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  bonusChip: {
    backgroundColor: "rgba(52,199,89,0.1)",
    borderWidth: 1,
    borderColor: "#0a2a10",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    marginTop: 2,
  },
  bonusChipText: {
    fontSize: 7,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 0.5,
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  bioText: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  teamSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  teamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
  },
  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#0d0d0d",
    flexShrink: 0,
  },
  teamLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  teamLogoInitials: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF1801",
    letterSpacing: 1,
  },
  teamInfo: { flex: 1, gap: 3 },
  teamName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  teamLocation: { fontSize: 11, color: "#444" },
  teamChevron: {
    fontSize: 18,
    color: "#333",
    flexShrink: 0,
  },
});
