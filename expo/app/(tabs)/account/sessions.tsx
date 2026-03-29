import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import {
  Trophy,
  Flag,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Calendar,
  Timer,
} from "lucide-react-native";
import { useLapTimer, RaceSession } from "@/providers/LapTimerProvider";

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${mins > 0 ? `${mins}:` : ""}${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

function formatTimeColon(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SessionCard({
  session,
  onDelete,
}: {
  session: RaceSession;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const bestLapIndex = session.laps.length > 0
    ? session.laps.indexOf(Math.min(...session.laps))
    : -1;
  const worstLapIndex = session.laps.length > 2
    ? session.laps.indexOf(Math.max(...session.laps))
    : -1;

  const avgLap =
    session.laps.length > 0
      ? session.laps.reduce((a, b) => a + b, 0) / session.laps.length
      : null;

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      "Delete Session",
      "Remove this session from your profile?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(session.id),
        },
      ]
    );
  }, [session.id, onDelete]);

  return (
    <View style={cardStyles.container} testID={`session-card-${session.id}`}>
      <TouchableOpacity
        style={cardStyles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={cardStyles.headerLeft}>
          <View style={cardStyles.trackIconWrap}>
            <Flag size={14} color="#FF1801" strokeWidth={2} />
          </View>
          <View style={cardStyles.headerInfo}>
            <Text style={cardStyles.trackName} numberOfLines={1}>
              {session.trackName}
            </Text>
            <View style={cardStyles.metaRow}>
              <Calendar size={10} color="#333" strokeWidth={2} />
              <Text style={cardStyles.metaText}>{formatDate(session.date)}</Text>
              <Text style={cardStyles.metaDot}>·</Text>
              <Clock size={10} color="#333" strokeWidth={2} />
              <Text style={cardStyles.metaText}>{session.timeOfDay}</Text>
            </View>
          </View>
        </View>
        <View style={cardStyles.headerRight}>
          <View style={cardStyles.lapCountBadge}>
            <Text style={cardStyles.lapCountText}>{session.laps.length} LAPS</Text>
          </View>
          {expanded ? (
            <ChevronUp size={16} color="#333" strokeWidth={2} />
          ) : (
            <ChevronDown size={16} color="#333" strokeWidth={2} />
          )}
        </View>
      </TouchableOpacity>

      <View style={cardStyles.statsRow}>
        <View style={cardStyles.statCell}>
          <Text style={cardStyles.statLabel}>BEST LAP</Text>
          <Text style={[cardStyles.statValue, { color: "#34C759" }]}>
            {session.bestLap !== null ? formatTime(session.bestLap) : "—"}
          </Text>
        </View>
        <View style={cardStyles.statDivider} />
        <View style={cardStyles.statCell}>
          <Text style={cardStyles.statLabel}>TOTAL TIME</Text>
          <Text style={cardStyles.statValue}>{formatTimeColon(session.totalTime)}</Text>
        </View>
        <View style={cardStyles.statDivider} />
        <View style={cardStyles.statCell}>
          <Text style={cardStyles.statLabel}>AVG LAP</Text>
          <Text style={cardStyles.statValue}>
            {avgLap !== null ? formatTime(avgLap) : "—"}
          </Text>
        </View>
      </View>

      {session.notes && (
        <View style={cardStyles.notesRow}>
          <Text style={cardStyles.notesText}>{session.notes}</Text>
        </View>
      )}

      {expanded && session.laps.length > 0 && (
        <View style={cardStyles.lapList}>
          <View style={cardStyles.lapListHeader}>
            <Text style={cardStyles.lapListTitle}>LAP BREAKDOWN</Text>
          </View>
          {session.laps.map((lapMs, i) => {
            const isBest = i === bestLapIndex;
            const isWorst = i === worstLapIndex;
            const delta =
              session.bestLap !== null && !isBest ? lapMs - session.bestLap : null;
            return (
              <View
                key={i}
                style={[
                  cardStyles.lapRow,
                  isBest && cardStyles.lapRowBest,
                  isWorst && cardStyles.lapRowWorst,
                ]}
              >
                <Text style={cardStyles.lapNum}>
                  L{String(i + 1).padStart(2, "0")}
                </Text>
                <Text
                  style={[
                    cardStyles.lapTime,
                    isBest && { color: "#34C759" },
                    isWorst && !isBest && { color: "#FF3B30" },
                  ]}
                >
                  {formatTime(lapMs)}
                </Text>
                <View style={cardStyles.lapRight}>
                  {isBest ? (
                    <View style={cardStyles.bestPill}>
                      <TrendingUp size={8} color="#34C759" strokeWidth={2.5} />
                      <Text style={cardStyles.bestPillText}>BEST</Text>
                    </View>
                  ) : delta !== null ? (
                    <Text style={cardStyles.deltaText}>+{formatTime(delta)}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={cardStyles.deleteBtn}
        onPress={handleDeletePress}
        activeOpacity={0.7}
        testID={`delete-session-${session.id}`}
      >
        <Trash2 size={13} color="#333" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 12,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "rgba(255,24,1,0.08)",
    borderWidth: 1,
    borderColor: "#2a0a00",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1, gap: 4 },
  trackName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  metaDot: { fontSize: 10, color: "#222" },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lapCountBadge: {
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  lapCountText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statCell: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: "#0d0d0d" },
  statLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#2a2a2a",
    letterSpacing: 1.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.3,
  },
  notesRow: {
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  notesText: {
    fontSize: 11,
    color: "#444",
    lineHeight: 16,
    fontStyle: "italic",
  },
  lapList: {
    borderTopWidth: 1,
    borderTopColor: "#0d0d0d",
  },
  lapListHeader: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
  },
  lapListTitle: {
    fontSize: 8,
    fontWeight: "700",
    color: "#222",
    letterSpacing: 1.5,
  },
  lapRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
    gap: 12,
  },
  lapRowBest: { backgroundColor: "rgba(52,199,89,0.04)" },
  lapRowWorst: { backgroundColor: "rgba(255,59,48,0.03)" },
  lapNum: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    width: 32,
    fontVariant: ["tabular-nums"] as const,
  },
  lapTime: {
    flex: 1,
    fontSize: 16,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.3,
  },
  lapRight: {
    alignItems: "flex-end",
    minWidth: 60,
  },
  bestPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(52,199,89,0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  bestPillText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 1,
  },
  deltaText: {
    fontSize: 10,
    color: "#444",
    fontVariant: ["tabular-nums"] as const,
  },
  deleteBtn: {
    position: "absolute",
    top: 12,
    right: 44,
    padding: 6,
  },
});

export default function SessionsScreen() {
  const { savedSessions, deleteSession, sessionsLoaded } = useLapTimer();
  const [sortBy, setSortBy] = useState<"date" | "best">("date");

  const sorted = [...savedSessions].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    const aBest = a.bestLap ?? Infinity;
    const bBest = b.bestLap ?? Infinity;
    return aBest - bBest;
  });

  const overallBest =
    savedSessions.length > 0
      ? savedSessions.reduce<number | null>((best, s) => {
          if (s.bestLap === null) return best;
          return best === null || s.bestLap < best ? s.bestLap : best;
        }, null)
      : null;

  const totalLaps = savedSessions.reduce((sum, s) => sum + s.laps.length, 0);

  return (
    <>
      <Stack.Screen options={{ title: "Race Sessions", headerTitleAlign: "center" }} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {savedSessions.length > 0 && (
          <View style={styles.overviewRow}>
            <View style={styles.overviewCell}>
              <Text style={styles.overviewValue}>{savedSessions.length}</Text>
              <Text style={styles.overviewLabel}>Sessions</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewCell}>
              <Text style={styles.overviewValue}>{totalLaps}</Text>
              <Text style={styles.overviewLabel}>Total Laps</Text>
            </View>
            <View style={styles.overviewDivider} />
            <View style={styles.overviewCell}>
              <Text style={[styles.overviewValue, { color: "#34C759" }]}>
                {overallBest !== null ? formatTime(overallBest) : "—"}
              </Text>
              <Text style={styles.overviewLabel}>All-Time Best</Text>
            </View>
          </View>
        )}

        {savedSessions.length > 0 && (
          <View style={styles.sortBar}>
            <Text style={styles.sortLabel}>SORT BY</Text>
            <View style={styles.sortBtns}>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === "date" && styles.sortBtnActive]}
                onPress={() => setSortBy("date")}
                activeOpacity={0.7}
              >
                <Calendar size={11} color={sortBy === "date" ? "#FF1801" : "#333"} strokeWidth={2} />
                <Text style={[styles.sortBtnText, sortBy === "date" && styles.sortBtnTextActive]}>
                  DATE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === "best" && styles.sortBtnActive]}
                onPress={() => setSortBy("best")}
                activeOpacity={0.7}
              >
                <Trophy size={11} color={sortBy === "best" ? "#FF1801" : "#333"} strokeWidth={2} />
                <Text style={[styles.sortBtnText, sortBy === "best" && styles.sortBtnTextActive]}>
                  BEST LAP
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!sessionsLoaded ? (
          <View style={styles.emptyState}>
            <Timer size={36} color="#1a1a1a" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Loading sessions...</Text>
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Timer size={36} color="#1a1a1a" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No Sessions Saved</Text>
            <Text style={styles.emptySub}>
              Run the Lap Timer in the Race tab and save a session to review it here.
            </Text>
          </View>
        ) : (
          sorted.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onDelete={deleteSession}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 16,
  },
  overviewRow: {
    flexDirection: "row",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  overviewCell: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  overviewDivider: {
    width: 1,
    backgroundColor: "#141414",
  },
  overviewValue: {
    fontSize: 22,
    fontWeight: "600",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  overviewLabel: {
    fontSize: 10,
    color: "#333",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sortLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#2a2a2a",
    letterSpacing: 1.5,
  },
  sortBtns: {
    flexDirection: "row",
    gap: 6,
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortBtnActive: {
    borderColor: "#2a0a00",
    backgroundColor: "rgba(255,24,1,0.06)",
  },
  sortBtnText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
  },
  sortBtnTextActive: {
    color: "#FF1801",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 64,
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
    color: "#1e1e1e",
    textAlign: "center",
    lineHeight: 18,
  },
});
