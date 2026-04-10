import React, { useMemo } from "react";
import { View, Text, StyleSheet, SectionList } from "react-native";
import { Calendar } from "lucide-react-native";
import EventCard from "@/components/league/EventCard";
import { useLeague } from "@/providers/LeagueProvider";
import type { LeagueEvent } from "@/types/league";

interface EventScheduleProps {
  seriesId: string;
  onSelectEvent: (eventId: string) => void;
}

interface Section {
  title: string;
  data: LeagueEvent[];
}

export default function EventSchedule({ seriesId, onSelectEvent }: EventScheduleProps) {
  const { events } = useLeague();

  const sections = useMemo<Section[]>(() => {
    const seriesEvents = events.filter((e) => e.seriesId === seriesId);
    const upcoming = seriesEvents
      .filter((e) => e.status === "scheduled" || e.status === "live")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const completed = seriesEvents
      .filter((e) => e.status === "completed")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const cancelled = seriesEvents.filter((e) => e.status === "cancelled");

    const result: Section[] = [];
    if (upcoming.length > 0) result.push({ title: "UPCOMING", data: upcoming });
    if (completed.length > 0) result.push({ title: "RESULTS", data: completed });
    if (cancelled.length > 0) result.push({ title: "CANCELLED", data: cancelled });
    return result;
  }, [events, seriesId]);

  const totalEvents = useMemo(
    () => events.filter((e) => e.seriesId === seriesId).length,
    [events, seriesId]
  );

  if (totalEvents === 0) {
    return (
      <View style={styles.empty}>
        <Calendar size={36} color="#1a1a1a" strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>No Events Yet</Text>
        <Text style={styles.emptySub}>
          Events will appear here once scheduled by the League admin.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <EventCard
          event={item}
          onPress={
            item.status === "completed" || item.status === "live"
              ? () => onSelectEvent(item.id)
              : undefined
          }
        />
      )}
      ListFooterComponent={<View style={{ height: 24 }} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 2,
  },
  sectionCount: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2a2a2a",
    fontVariant: ["tabular-nums"] as const,
  },
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
});
