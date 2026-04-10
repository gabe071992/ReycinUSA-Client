import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { ArrowLeft, BookOpen } from "lucide-react-native";
import RuleSection from "@/components/league/RuleSection";
import { useLeague } from "@/providers/LeagueProvider";
import type { RuleCategory } from "@/types/league";

interface RulesBrowserProps {
  seriesId: string;
  onBack: () => void;
}

const CATEGORY_ORDER: RuleCategory[] = [
  "technical",
  "sporting",
  "safety",
  "administrative",
];

export default function RulesBrowser({ seriesId, onBack }: RulesBrowserProps) {
  const { rules, hpClasses, seriesMap } = useLeague();

  const series = seriesMap[seriesId];

  const seriesRules = useMemo(
    () => rules.filter((r) => r.seriesId === seriesId),
    [rules, seriesId]
  );

  const seriesHpClasses = useMemo(
    () => hpClasses.filter((c) => c.seriesId === seriesId),
    [hpClasses, seriesId]
  );

  const grouped = useMemo(() => {
    const map: Partial<Record<RuleCategory, typeof seriesRules>> = {};
    for (const rule of seriesRules) {
      if (!map[rule.category]) map[rule.category] = [];
      map[rule.category]!.push(rule);
    }
    return map;
  }, [seriesRules]);

  const isEmpty = seriesRules.length === 0 && seriesHpClasses.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backRow}
          onPress={onBack}
          activeOpacity={0.7}
          testID="rules-back-btn"
        >
          <ArrowLeft size={14} color="#555" strokeWidth={2} />
          <Text style={styles.backText}>BACK</Text>
        </TouchableOpacity>

        <View style={styles.titleRow}>
          <BookOpen size={14} color="#444" strokeWidth={1.5} />
          <View>
            <Text style={styles.screenTitle}>RULE BOOK</Text>
            {series && (
              <Text style={styles.seriesName} numberOfLines={1}>
                {series.name}
              </Text>
            )}
          </View>
        </View>
      </View>

      {isEmpty ? (
        <View style={styles.empty}>
          <BookOpen size={40} color="#1a1a1a" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No Rules Published</Text>
          <Text style={styles.emptySub}>
            Series regulations will appear here once published by the administrator.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {seriesHpClasses.length > 0 && (
            <RuleSection
              category="HP Classes"
              rules={[]}
              hpClasses={seriesHpClasses}
            />
          )}

          {CATEGORY_ORDER.map((category) => {
            const catRules = grouped[category];
            if (!catRules || catRules.length === 0) return null;
            return (
              <RuleSection key={category} category={category} rules={catRules} />
            );
          })}

          {Object.entries(grouped)
            .filter(
              ([cat]) => !CATEGORY_ORDER.includes(cat as RuleCategory)
            )
            .map(([category, catRules]) => (
              <RuleSection
                key={category}
                category={category}
                rules={catRules ?? []}
              />
            ))}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {seriesRules.length} rule
              {seriesRules.length !== 1 ? "s" : ""} · {seriesHpClasses.length}{" "}
              HP class{seriesHpClasses.length !== 1 ? "es" : ""}
            </Text>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  backRow: {
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 1,
  },
  seriesName: {
    fontSize: 11,
    color: "#444",
    marginTop: 2,
  },
  content: { paddingTop: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#222",
    fontStyle: "italic",
  },
});
