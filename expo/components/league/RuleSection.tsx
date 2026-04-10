import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Rule, HpClass } from "@/types/league";

interface RuleSectionProps {
  category: string;
  rules: Rule[];
  hpClasses?: HpClass[];
}

export default function RuleSection({ category, rules, hpClasses }: RuleSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryDot} />
        <Text style={styles.categoryLabel}>{category.toUpperCase()}</Text>
      </View>

      {hpClasses && hpClasses.length > 0 && (
        <>
          {hpClasses.map((cls) => (
            <View key={cls.id} style={styles.card}>
              <View style={styles.classPillRow}>
                <View style={styles.classPill}>
                  <Text style={styles.classPillText}>{cls.label}</Text>
                </View>
              </View>
              <View style={styles.classStats}>
                <View style={styles.classStat}>
                  <Text style={styles.classStatVal}>
                    {cls.minHp} – {cls.maxHp}
                  </Text>
                  <Text style={styles.classStatLbl}>HP RANGE</Text>
                </View>
                <View style={styles.classStatDivider} />
                <View style={styles.classStat}>
                  <Text style={styles.classStatVal}>{cls.weightMin}</Text>
                  <Text style={styles.classStatLbl}>MIN LBS</Text>
                </View>
              </View>
              {!!cls.additionalRules && (
                <Text style={styles.ruleBody}>{cls.additionalRules}</Text>
              )}
            </View>
          ))}
        </>
      )}

      {rules.map((rule) => (
        <View key={rule.id} style={styles.card}>
          <View style={styles.ruleTitleRow}>
            <Text style={styles.ruleTitle}>{rule.title}</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{rule.version}</Text>
            </View>
          </View>
          <Text style={styles.effectiveDate}>
            Effective {rule.effectiveDate}
          </Text>
          <Text style={styles.ruleBody}>{rule.body}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  categoryDot: {
    width: 3,
    height: 14,
    borderRadius: 2,
    backgroundColor: "#FF1801",
  },
  categoryLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  card: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  classPillRow: {
    flexDirection: "row",
  },
  classPill: {
    backgroundColor: "rgba(74,144,217,0.08)",
    borderWidth: 1,
    borderColor: "#0d1f30",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 5,
  },
  classPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4A90D9",
    letterSpacing: 0.5,
  },
  classStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  classStat: {
    gap: 2,
  },
  classStatVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
  classStatLbl: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  classStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#1a1a1a",
  },
  ruleTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  ruleTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    lineHeight: 18,
    letterSpacing: -0.1,
  },
  versionBadge: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    flexShrink: 0,
  },
  versionText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  effectiveDate: {
    fontSize: 10,
    color: "#333",
    fontStyle: "italic",
  },
  ruleBody: {
    fontSize: 12,
    color: "#666",
    lineHeight: 19,
  },
});
