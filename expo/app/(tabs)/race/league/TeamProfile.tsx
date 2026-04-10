import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { ArrowLeft, MapPin, Mail, Phone, Car } from "lucide-react-native";
import DriverCard from "@/components/league/DriverCard";
import VehicleCard from "@/components/league/VehicleCard";
import { useLeague } from "@/providers/LeagueProvider";

interface TeamProfileProps {
  teamId: string;
  onBack: () => void;
  onSelectDriver: (driverId: string) => void;
}

export default function TeamProfile({
  teamId,
  onBack,
  onSelectDriver,
}: TeamProfileProps) {
  const { teamsMap, drivers, vehicles, hpClasses } = useLeague();

  const team = teamsMap[teamId];

  const teamDrivers = useMemo(
    () => drivers.filter((d) => d.teamId === teamId),
    [drivers, teamId]
  );

  const teamVehicles = useMemo(
    () => vehicles.filter((v) => v.teamId === teamId),
    [vehicles, teamId]
  );

  if (!team) {
    return (
      <View style={styles.root}>
        <TouchableOpacity style={styles.backRow} onPress={onBack} activeOpacity={0.7} testID="team-profile-back">
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Team not found</Text>
        </View>
      </View>
    );
  }

  const location = [team.city, team.state].filter(Boolean).join(", ");

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={onBack}
          activeOpacity={0.7}
          testID="team-profile-back"
        >
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <View style={styles.heroSection}>
          <View style={styles.logoWrap}>
            {team.logoUrl ? (
              <Image
                source={{ uri: team.logoUrl }}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoInitials}>
                  {team.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.teamName}>{team.name}</Text>
            {!!location && (
              <View style={styles.metaRow}>
                <MapPin size={11} color="#555" strokeWidth={2} />
                <Text style={styles.metaText}>{location}</Text>
              </View>
            )}
            <View style={styles.countRow}>
              <View style={styles.countBadge}>
                <Text style={styles.countNum}>{teamDrivers.length}</Text>
                <Text style={styles.countLbl}>DRIVERS</Text>
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countNum}>{teamVehicles.length}</Text>
                <Text style={styles.countLbl}>VEHICLES</Text>
              </View>
            </View>
          </View>
        </View>

        {!!team.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.sectionLabel}>ABOUT</Text>
            <Text style={styles.bioText}>{team.bio}</Text>
          </View>
        )}

        <View style={styles.ownerSection}>
          <Text style={styles.sectionLabel}>OWNER</Text>
          <View style={styles.ownerCard}>
            <Text style={styles.ownerName}>{team.ownerName}</Text>
            {!!team.ownerEmail && (
              <View style={styles.contactRow}>
                <Mail size={11} color="#444" strokeWidth={2} />
                <Text style={styles.contactText}>{team.ownerEmail}</Text>
              </View>
            )}
            {!!team.ownerPhone && (
              <View style={styles.contactRow}>
                <Phone size={11} color="#444" strokeWidth={2} />
                <Text style={styles.contactText}>{team.ownerPhone}</Text>
              </View>
            )}
          </View>
        </View>

        {teamDrivers.length > 0 && (
          <View style={styles.rosterSection}>
            <Text style={styles.sectionLabel}>ROSTER</Text>
            <View style={styles.listCard}>
              {teamDrivers.map((driver) => (
                <DriverCard
                  key={driver.id}
                  driver={driver}
                  onPress={() => onSelectDriver(driver.id)}
                />
              ))}
            </View>
          </View>
        )}

        {teamVehicles.length > 0 && (
          <View style={styles.vehiclesSection}>
            <View style={styles.sectionHeaderRow}>
              <Car size={12} color="#444" strokeWidth={2} />
              <Text style={styles.sectionLabel}>VEHICLES</Text>
            </View>
            <View style={styles.listCard}>
              {teamVehicles.map((vehicle) => {
                const cls = hpClasses.find((c) => c.id === vehicle.classId);
                return (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} hpClass={cls} />
                );
              })}
            </View>
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
    flex: 1,
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
  logoWrap: { flexShrink: 0 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#0d0d0d",
  },
  logoFallback: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitials: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FF1801",
    letterSpacing: 2,
  },
  heroInfo: { flex: 1, gap: 8 },
  teamName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: { fontSize: 12, color: "#555" },
  countRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  countBadge: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    gap: 2,
  },
  countNum: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
  countLbl: {
    fontSize: 7,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  bioSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 13,
    color: "#888",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  ownerSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  ownerCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
    gap: 7,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  contactText: { fontSize: 12, color: "#555" },
  rosterSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  listCard: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    overflow: "hidden",
  },
  vehiclesSection: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
});
