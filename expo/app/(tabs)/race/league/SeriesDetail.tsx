import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { ArrowLeft, BookOpen } from "lucide-react-native";
import EventSchedule from "@/app/(tabs)/race/league/EventSchedule";
import DriverStandings from "@/app/(tabs)/race/league/DriverStandings";
import TeamStandings from "@/app/(tabs)/race/league/TeamStandings";
import { useLeague } from "@/providers/LeagueProvider";

type SeriesTab = "schedule" | "standings" | "rules";
type StandingsTab = "drivers" | "teams";

interface SeriesDetailProps {
  seriesId: string;
  leagueId: string;
  onBack: () => void;
  onSelectEvent: (eventId: string) => void;
}

export default function SeriesDetail({
  seriesId,
  leagueId,
  onBack,
  onSelectEvent,
}: SeriesDetailProps) {
  const { seriesMap, hpClasses, events, rules } = useLeague();
  const [activeTab, setActiveTab] = useState<SeriesTab>("schedule");
  const [standingsTab, setStandingsTab] = useState<StandingsTab>("drivers");

  const series = seriesMap[seriesId];

  const seriesHpClasses = useMemo(
    () => hpClasses.filter((c) => c.seriesId === seriesId),
    [hpClasses, seriesId]
  );

  const seriesRules = useMemo(
    () => rules.filter((r) => r.seriesId === seriesId),
    [rules, seriesId]
  );

  const completedCount = useMemo(
    () => events.filter((e) => e.seriesId === seriesId && e.status === "completed").length,
    [events, seriesId]
  );

  const upcomingCount = useMemo(
    () =>
      events.filter(
        (e) => e.seriesId === seriesId && e.status === "scheduled"
      ).length,
    [events, seriesId]
  );

  const TABS: { id: SeriesTab; label: string }[] = [
    { id: "schedule", label: "SCHEDULE" },
    { id: "standings", label: "STANDINGS" },
    { id: "rules", label: "RULES" },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.7}
          testID="series-back-btn"
        >
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>LEAGUES</Text>
        </TouchableOpacity>

        <View style={styles.seriesInfo}>
          <Text style={styles.seriesName} numberOfLines={2}>
            {series?.name ?? "Series"}
          </Text>
          <View style={styles.metaBadgeRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{upcomingCount} UPCOMING</Text>
            </View>
            {completedCount > 0 && (
              <View style={[styles.metaBadge, styles.completedBadge]}>
                <Text style={[styles.metaBadgeText, styles.completedText]}>
                  {completedCount} RESULTS
                </Text>
              </View>
            )}
            {seriesHpClasses.length > 0 && (
              <View style={[styles.metaBadge, styles.classBadge]}>
                <Text style={[styles.metaBadgeText, styles.classText]}>
                  {seriesHpClasses.length}{" "}
                  {seriesHpClasses.length === 1 ? "CLASS" : "CLASSES"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              testID={`series-tab-${tab.id}`}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.content}>
        {activeTab === "schedule" && (
          <EventSchedule seriesId={seriesId} onSelectEvent={onSelectEvent} />
        )}

        {activeTab === "standings" && (
          <View style={styles.standingsFlex}>
            <View style={styles.standingsToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  standingsTab === "drivers" && styles.toggleBtnActive,
                ]}
                onPress={() => setStandingsTab("drivers")}
                activeOpacity={0.7}
                testID="standings-toggle-drivers"
              >
                <Text
                  style={[
                    styles.toggleText,
                    standingsTab === "drivers" && styles.toggleTextActive,
                  ]}
                >
                  DRIVERS CUP
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  standingsTab === "teams" && styles.toggleBtnActive,
                ]}
                onPress={() => setStandingsTab("teams")}
                activeOpacity={0.7}
                testID="standings-toggle-teams"
              >
                <Text
                  style={[
                    styles.toggleText,
                    standingsTab === "teams" && styles.toggleTextActive,
                  ]}
                >
                  MECHANICS CUP
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.standingsContent}>
              {standingsTab === "drivers" ? (
                <DriverStandings seriesId={seriesId} />
              ) : (
                <TeamStandings seriesId={seriesId} />
              )}
            </View>
          </View>
        )}

        {activeTab === "rules" && (
          <RulesTab rules={seriesRules} hpClasses={seriesHpClasses} />
        )}
      </View>
    </View>
  );
}

function RulesTab({
  rules,
  hpClasses,
}: {
  rules: ReturnType<typeof useLeague>["rules"];
  hpClasses: ReturnType<typeof useLeague>["hpClasses"];
}) {
  const grouped = useMemo(() => {
    const map: Record<string, typeof rules> = {};
    for (const rule of rules) {
      if (!map[rule.category]) map[rule.category] = [];
      map[rule.category].push(rule);
    }
    return map;
  }, [rules]);

  if (rules.length === 0 && hpClasses.length === 0) {
    return (
      <View style={styles.empty}>
        <BookOpen size={36} color="#1a1a1a" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No Rules Published</Text>
        <Text style={styles.emptySub}>
          Series regulations will appear here once published by the admin.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {hpClasses.length > 0 && (
        <View style={styles.ruleSection}>
          <Text style={styles.ruleCategoryHeader}>HP CLASSES</Text>
          {hpClasses.map((cls) => (
            <View key={cls.id} style={styles.ruleCard}>
              <View style={styles.classBadgeLarge}>
                <Text style={styles.classBadgeLargeText}>{cls.label}</Text>
              </View>
              <View style={styles.ruleClassStats}>
                <Text style={styles.ruleClassStat}>
                  {cls.minHp} – {cls.maxHp} HP
                </Text>
                <Text style={styles.ruleClassStat}>Min {cls.weightMin} lbs</Text>
              </View>
              {!!cls.additionalRules && (
                <Text style={styles.ruleBody}>{cls.additionalRules}</Text>
              )}
            </View>
          ))}
        </View>
      )}
      {Object.entries(grouped).map(([category, catRules]) => (
        <View key={category} style={styles.ruleSection}>
          <Text style={styles.ruleCategoryHeader}>{category.toUpperCase()}</Text>
          {catRules.map((rule) => (
            <View key={rule.id} style={styles.ruleCard}>
              <View style={styles.ruleTitleRow}>
                <Text style={styles.ruleTitle}>{rule.title}</Text>
                <Text style={styles.ruleVersion}>v{rule.version}</Text>
              </View>
              <Text style={styles.ruleEffective}>
                Effective {rule.effectiveDate}
              </Text>
              <Text style={styles.ruleBody}>{rule.body}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1.5,
  },
  seriesInfo: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  seriesName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.4,
  },
  metaBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaBadge: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  completedBadge: {
    backgroundColor: "rgba(52,199,89,0.07)",
    borderColor: "#0a2a10",
  },
  classBadge: {
    backgroundColor: "rgba(74,144,217,0.07)",
    borderColor: "#0d1f30",
  },
  metaBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
  },
  completedText: { color: "#34C759" },
  classText: { color: "#4A90D9" },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  tabTextActive: { color: "#FFF" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 2,
    backgroundColor: "#FF1801",
    borderRadius: 1,
  },
  content: { flex: 1 },
  standingsFlex: { flex: 1 },
  standingsToggle: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    backgroundColor: "#050505",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(255,24,1,0.06)",
    borderBottomWidth: 2,
    borderBottomColor: "#FF1801",
  },
  toggleText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  toggleTextActive: { color: "#FF1801" },
  standingsContent: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    color: "#2a2a2a",
    textAlign: "center",
    lineHeight: 18,
  },
  ruleSection: {
    marginTop: 6,
  },
  ruleCategoryHeader: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  ruleCard: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
    gap: 7,
  },
  ruleTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  ruleTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: -0.1,
  },
  ruleVersion: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  ruleEffective: {
    fontSize: 10,
    color: "#333",
    fontStyle: "italic" as const,
  },
  ruleBody: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  classBadgeLarge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(74,144,217,0.08)",
    borderWidth: 1,
    borderColor: "#0d1f30",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 5,
  },
  classBadgeLargeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A90D9",
    letterSpacing: 0.5,
  },
  ruleClassStats: {
    flexDirection: "row",
    gap: 12,
  },
  ruleClassStat: {
    fontSize: 12,
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    fontWeight: "600",
  },
});
