import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar, MapPin, ChevronRight, Radio } from "lucide-react-native";
import type { LeagueEvent } from "@/types/league";

const STATUS_CONFIG = {
  scheduled: { label: "UPCOMING", color: "#4A90D9", bg: "rgba(74,144,217,0.1)", border: "#1a2d3d" },
  live: { label: "LIVE", color: "#FF1801", bg: "rgba(255,24,1,0.12)", border: "#2a0800" },
  completed: { label: "COMPLETED", color: "#34C759", bg: "rgba(52,199,89,0.1)", border: "#0a2a10" },
  cancelled: { label: "CANCELLED", color: "#555", bg: "rgba(85,85,85,0.08)", border: "#1a1a1a" },
} as const;

interface EventCardProps {
  event: LeagueEvent;
  onPress?: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const cfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.scheduled;
  const dateFormatted = event.date
    ? new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "TBD";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      testID={`event-card-${event.id}`}
      disabled={!onPress}
    >
      <View style={styles.leftAccent} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {event.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            {event.status === "live" && <Radio size={8} color={cfg.color} strokeWidth={2.5} />}
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Calendar size={11} color="#444" strokeWidth={2} />
          <Text style={styles.metaText}>{dateFormatted}</Text>
        </View>
        <View style={styles.metaRow}>
          <MapPin size={11} color="#444" strokeWidth={2} />
          <Text style={styles.metaText}>{event.location || "TBD"}</Text>
        </View>
      </View>
      {onPress && <ChevronRight size={14} color="#2a2a2a" strokeWidth={2} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#111",
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    overflow: "hidden",
    gap: 0,
    paddingRight: 14,
  },
  leftAccent: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: "#FF1801",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    marginRight: 14,
  },
  body: {
    flex: 1,
    paddingVertical: 13,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: "#555",
  },
});
