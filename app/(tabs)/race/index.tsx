import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { theme } from "@/constants/theme";
import { Flag, Timer, TrendingUp, MapPin, ChevronRight, Play, Square, RotateCcw } from "lucide-react-native";

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${mins > 0 ? `${mins}:` : ""}${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

export default function RaceScreen() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);
  const [lapStart, setLapStart] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const lapStartRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [pulseAnim]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    startRef.current = now - elapsed;
    lapStartRef.current = now - lapStart;
    setRunning(true);
    startPulse();
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 50);
  }, [elapsed, lapStart, startPulse]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopPulse();
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [stopPulse]);

  const handleLap = useCallback(() => {
    const now = Date.now();
    const lapTime = now - lapStartRef.current;
    setLaps((prev) => [lapTime, ...prev]);
    lapStartRef.current = now;
    setLapStart(0);
  }, []);

  const handleReset = useCallback(() => {
    handleStop();
    setElapsed(0);
    setLaps([]);
    setLapStart(0);
    startRef.current = 0;
    lapStartRef.current = 0;
  }, [handleStop]);

  const bestLap = laps.length > 0 ? Math.min(...laps) : null;
  const currentLapElapsed = running ? elapsed - laps.reduce((a, b) => a + b, 0) : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.timerSection}>
        <View style={styles.timerHeader}>
          <Flag size={16} color={theme.colors.textGray} strokeWidth={1.5} />
          <Text style={styles.timerHeaderText}>Lap Timer</Text>
          {running && (
            <View style={styles.liveBadge}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        <Text style={styles.timerDisplay}>{formatTime(elapsed)}</Text>

        {laps.length > 0 && (
          <Text style={styles.currentLap}>
            Lap {laps.length + 1} — {formatTime(currentLapElapsed)}
          </Text>
        )}

        <View style={styles.timerControls}>
          {!running ? (
            <>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleReset}
                activeOpacity={0.7}
                disabled={elapsed === 0}
              >
                <RotateCcw size={20} color={elapsed === 0 ? theme.colors.borderGray : theme.colors.textGray} strokeWidth={1.8} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
                <Play size={24} color={theme.colors.black} strokeWidth={2} fill={theme.colors.black} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlBtn}
                onPress={handleLap}
                disabled={true}
              >
                <Flag size={20} color={theme.colors.borderGray} strokeWidth={1.8} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.controlBtn} onPress={handleLap} activeOpacity={0.7}>
                <Flag size={20} color={theme.colors.white} strokeWidth={1.8} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.startBtn, styles.stopBtn]} onPress={handleStop} activeOpacity={0.85}>
                <Square size={22} color={theme.colors.white} strokeWidth={0} fill={theme.colors.white} />
              </TouchableOpacity>
              <View style={styles.controlBtn} />
            </>
          )}
        </View>
      </View>

      {laps.length > 0 && (
        <View style={styles.lapsSection}>
          <Text style={styles.sectionTitle}>Lap Times</Text>
          <View style={styles.lapsCard}>
            {bestLap !== null && (
              <View style={styles.bestLapRow}>
                <TrendingUp size={14} color={theme.colors.success} strokeWidth={1.8} />
                <Text style={styles.bestLapText}>Best: {formatTime(bestLap)}</Text>
              </View>
            )}
            {laps.map((lap, i) => {
              const lapNum = laps.length - i;
              const isBest = lap === bestLap;
              return (
                <View key={i} style={[styles.lapRow, isBest && styles.lapRowBest]}>
                  <Text style={[styles.lapNum, isBest && styles.lapNumBest]}>L{lapNum}</Text>
                  <Text style={[styles.lapTime, isBest && styles.lapTimeBest]}>{formatTime(lap)}</Text>
                  {isBest && <Text style={styles.bestTag}>BEST</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={styles.sessionsSection}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        <View style={styles.comingSoonCard}>
          <Timer size={36} color={theme.colors.textGray} strokeWidth={1} />
          <Text style={styles.comingSoonTitle}>Track Sessions Coming Soon</Text>
          <Text style={styles.comingSoonBody}>
            Full track session logging, GPS lap timing, and performance analytics will be available in an upcoming update.
          </Text>
        </View>
      </View>

      <View style={styles.eventsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Track Events</Text>
          <TouchableOpacity style={styles.seeAllBtn} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>See All</Text>
            <ChevronRight size={14} color={theme.colors.textGray} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <View style={styles.eventCard}>
          <View style={styles.eventIconWrap}>
            <MapPin size={20} color={theme.colors.textGray} strokeWidth={1.5} />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>Reycin Track Day</Text>
            <Text style={styles.eventSub}>Events will be announced in the community</Text>
          </View>
          <ChevronRight size={16} color={theme.colors.textGray} strokeWidth={1.5} />
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  timerSection: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
    alignItems: "center",
    gap: 8,
  },
  timerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  timerHeaderText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 1,
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
    letterSpacing: 0.5,
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: "200",
    color: theme.colors.white,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  currentLap: {
    fontSize: 14,
    color: theme.colors.textGray,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  timerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    marginTop: 8,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.darkGray,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    alignItems: "center",
    justifyContent: "center",
  },
  startBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  stopBtn: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  lapsSection: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.white,
    letterSpacing: -0.3,
  },
  lapsCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    overflow: "hidden",
  },
  bestLapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(52,199,89,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  bestLapText: {
    fontSize: 13,
    color: theme.colors.success,
    fontWeight: "600",
  },
  lapRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
    gap: 12,
  },
  lapRowBest: {
    backgroundColor: "rgba(52,199,89,0.05)",
  },
  lapNum: {
    fontSize: 13,
    color: theme.colors.textGray,
    width: 36,
    fontWeight: "500",
  },
  lapNumBest: {
    color: theme.colors.success,
  },
  lapTime: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    fontVariant: ["tabular-nums"],
  },
  lapTimeBest: {
    color: theme.colors.success,
  },
  bestTag: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.success,
    letterSpacing: 0.5,
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionsSection: {
    padding: 20,
    gap: 12,
  },
  comingSoonCard: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    marginTop: 8,
  },
  comingSoonBody: {
    fontSize: 13,
    color: theme.colors.textGray,
    textAlign: "center",
    lineHeight: 20,
  },
  eventsSection: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: theme.colors.textGray,
    fontWeight: "500",
  },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 16,
  },
  eventIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.lightGray,
    alignItems: "center",
    justifyContent: "center",
  },
  eventInfo: {
    flex: 1,
    gap: 3,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.white,
  },
  eventSub: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
});
