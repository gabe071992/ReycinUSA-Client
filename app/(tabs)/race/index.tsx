import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  Flag,
  Wrench,
  Radio,
  MapPin,
  Play,
  Square,
  RotateCcw,
  TrendingUp,
  Zap,
  WifiOff,
} from "lucide-react-native";

type RaceTab = "dash" | "timer" | "tracks" | "tuning" | "pit";

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

const SHIFT_LIGHTS_CONFIG = [
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#00FF41" },
  { color: "#FFD600" },
  { color: "#FFD600" },
  { color: "#FFD600" },
  { color: "#FF1801" },
  { color: "#FF1801" },
  { color: "#FF1801" },
];

function BarGauge({
  value,
  max,
  label,
  unit,
  accentColor,
}: {
  value: number;
  max: number;
  label: string;
  unit: string;
  accentColor: string;
}) {
  const pct = Math.min(value / max, 1);
  const barAnim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [pct, barAnim]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.labelRow}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.value, { color: accentColor }]}>
          {Math.round(value)}
          <Text style={gaugeStyles.unit}> {unit}</Text>
        </Text>
      </View>
      <View style={gaugeStyles.track}>
        <Animated.View
          style={[gaugeStyles.fill, { width: barWidth, backgroundColor: accentColor }]}
        />
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: { gap: 5 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 10,
    fontWeight: "500",
    color: "#555",
  },
  track: {
    height: 6,
    backgroundColor: "#111",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#222",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});

function ShiftLights({ rpmPct }: { rpmPct: number }) {
  const litCount = Math.floor(rpmPct * SHIFT_LIGHTS_CONFIG.length);
  const allFlash = useRef(new Animated.Value(1)).current;

  const isMaxRpm = rpmPct >= 1;
  useEffect(() => {
    if (isMaxRpm) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(allFlash, { toValue: 0.1, duration: 80, useNativeDriver: true }),
          Animated.timing(allFlash, { toValue: 1, duration: 80, useNativeDriver: true }),
        ])
      ).start();
    } else {
      allFlash.stopAnimation();
      Animated.timing(allFlash, { toValue: 1, duration: 50, useNativeDriver: true }).start();
    }
  }, [isMaxRpm, allFlash]);

  return (
    <View style={shiftStyles.row}>
      {SHIFT_LIGHTS_CONFIG.map((cfg, i) => {
        const isLit = i < litCount;
        return (
          <Animated.View
            key={i}
            style={[
              shiftStyles.light,
              isLit && { backgroundColor: cfg.color, shadowColor: cfg.color, shadowOpacity: 0.9, shadowRadius: 8, elevation: 6 },
              !isLit && { backgroundColor: "#111", borderColor: "#1a1a1a" },
              isMaxRpm && isLit && { opacity: allFlash },
            ]}
          />
        );
      })}
    </View>
  );
}

const shiftStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  light: {
    flex: 1,
    height: 10,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#222",
    maxWidth: 28,
  },
});

function DigitalDashScreen() {
  const [isDemo, setIsDemo] = useState(false);
  const demoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);

  const [rpm, setRpm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState<number | string>(1);
  const [throttle, setThrottle] = useState(0);
  const [brake, setBrake] = useState(0);
  const [oilTemp, setOilTemp] = useState(90);
  const [waterTemp, setWaterTemp] = useState(85);
  const [voltage, setVoltage] = useState(13.8);
  const [lapTime, setLapTime] = useState(0);
  const [lastLap, setLastLap] = useState<number | null>(null);

  const lapTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lapStartRef = useRef(0);

  const MAX_RPM = 9800;

  useEffect(() => {
    if (isDemo) {
      lapStartRef.current = Date.now();
      lapTimerRef.current = setInterval(() => {
        setLapTime(Date.now() - lapStartRef.current);
      }, 50);

      demoRef.current = setInterval(() => {
        tickRef.current += 1;
        const t = tickRef.current;
        const cycle = (t % 300) / 300;

        const rpmVal = 1500 + Math.abs(Math.sin(cycle * Math.PI * 2)) * 7200 + Math.random() * 300;
        const spd = Math.round((rpmVal / MAX_RPM) * 118 + Math.random() * 4);
        const g = rpmVal < 2500 ? 1 : rpmVal < 4000 ? 2 : rpmVal < 5500 ? 3 : rpmVal < 7000 ? 4 : rpmVal < 8500 ? 5 : 6;
        const thr = Math.round(Math.max(0, Math.sin(cycle * Math.PI * 2) * 100));
        const brk = thr < 20 ? Math.round(Math.random() * 60) : 0;

        setRpm(rpmVal);
        setSpeed(spd);
        setGear(g);
        setThrottle(thr);
        setBrake(brk);
        setOilTemp(90 + Math.sin(t * 0.01) * 15 + Math.random() * 2);
        setWaterTemp(85 + Math.sin(t * 0.008) * 12 + Math.random() * 2);
        setVoltage(13.2 + Math.random() * 0.8);

        if (t % 240 === 0 && t > 0) {
          const lt = Date.now() - lapStartRef.current;
          setLastLap(lt);
          lapStartRef.current = Date.now();
          setLapTime(0);
        }
      }, 50);
    } else {
      if (demoRef.current) clearInterval(demoRef.current);
      if (lapTimerRef.current) clearInterval(lapTimerRef.current);
      tickRef.current = 0;
      setRpm(0); setSpeed(0); setGear(1); setThrottle(0); setBrake(0);
      setOilTemp(90); setWaterTemp(85); setVoltage(13.8); setLapTime(0); setLastLap(null);
    }
    return () => {
      if (demoRef.current) clearInterval(demoRef.current);
      if (lapTimerRef.current) clearInterval(lapTimerRef.current);
    };
  }, [isDemo]);

  const rpmPct = rpm / MAX_RPM;
  const rpmColor = rpmPct < 0.65 ? "#FFFFFF" : rpmPct < 0.82 ? "#FFD600" : "#FF1801";

  return (
    <View style={dashStyles.root}>
      <View style={dashStyles.topBar}>
        <View style={dashStyles.connBadge}>
          {isDemo ? (
            <Zap size={11} color="#FFD600" strokeWidth={2} />
          ) : (
            <WifiOff size={11} color="#444" strokeWidth={2} />
          )}
          <Text style={[dashStyles.connText, { color: isDemo ? "#FFD600" : "#444" }]}>
            {isDemo ? "DEMO" : "NO SIGNAL"}
          </Text>
        </View>
        <TouchableOpacity
          style={[dashStyles.demoBtn, isDemo && dashStyles.demoBtnActive]}
          onPress={() => setIsDemo((v) => !v)}
          activeOpacity={0.75}
        >
          <Text style={[dashStyles.demoBtnText, isDemo && dashStyles.demoBtnTextActive]}>
            {isDemo ? "STOP DEMO" : "RUN DEMO"}
          </Text>
        </TouchableOpacity>
      </View>

      <ShiftLights rpmPct={rpmPct} />

      <View style={dashStyles.centerSection}>
        <View style={dashStyles.speedBlock}>
          <Text style={dashStyles.speedLabel}>KM/H</Text>
          <Text style={dashStyles.speedValue}>{String(speed).padStart(3, " ")}</Text>
        </View>

        <View style={dashStyles.gearBlock}>
          <Text style={dashStyles.gearLabel}>GEAR</Text>
          <Text style={[dashStyles.gearValue, { color: rpmColor }]}>{gear}</Text>
        </View>

        <View style={dashStyles.lapBlock}>
          <Text style={dashStyles.lapLabel}>LAP</Text>
          <Text style={dashStyles.lapValue}>{formatTimeColon(lapTime)}</Text>
          {lastLap !== null && (
            <Text style={dashStyles.lastLapValue}>PREV {formatTime(lastLap)}</Text>
          )}
        </View>
      </View>

      <View style={dashStyles.rpmSection}>
        <View style={dashStyles.rpmLabelRow}>
          <Text style={dashStyles.rpmLabel}>RPM</Text>
          <Text style={[dashStyles.rpmValue, { color: rpmColor }]}>
            {Math.round(rpm).toLocaleString()}
          </Text>
          <Text style={dashStyles.rpmMax}>/ {MAX_RPM.toLocaleString()}</Text>
        </View>
        <View style={dashStyles.rpmTrack}>
          <Animated.View
            style={[
              dashStyles.rpmFill,
              {
                width: `${Math.min(rpmPct * 100, 100)}%`,
                backgroundColor: rpmColor,
              },
            ]}
          />
          <View style={[dashStyles.rpmMarker, { left: "65%" }]} />
          <View style={[dashStyles.rpmMarker, { left: "82%" }]} />
        </View>
        <View style={dashStyles.rpmTicks}>
          {[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000].map((v) => (
            <Text key={v} style={dashStyles.rpmTick}>{v === 0 ? "" : `${v / 1000}k`}</Text>
          ))}
        </View>
      </View>

      <View style={dashStyles.gaugeGrid}>
        <BarGauge value={throttle} max={100} label="THROTTLE" unit="%" accentColor="#00FF41" />
        <BarGauge value={brake} max={100} label="BRAKE" unit="%" accentColor="#FF1801" />
        <BarGauge value={oilTemp} max={160} label="OIL TEMP" unit="°C" accentColor="#FF9500" />
        <BarGauge value={waterTemp} max={130} label="WATER TEMP" unit="°C" accentColor="#00B4FF" />
      </View>

      <View style={dashStyles.statusRow}>
        <View style={dashStyles.statusCell}>
          <Text style={dashStyles.statusLabel}>VOLTAGE</Text>
          <Text style={dashStyles.statusValue}>{voltage.toFixed(1)}V</Text>
        </View>
        <View style={dashStyles.statusDivider} />
        <View style={dashStyles.statusCell}>
          <Text style={dashStyles.statusLabel}>OBD PORT</Text>
          <Text style={[dashStyles.statusValue, { color: "#444" }]}>—</Text>
        </View>
        <View style={dashStyles.statusDivider} />
        <View style={dashStyles.statusCell}>
          <Text style={dashStyles.statusLabel}>GPS</Text>
          <Text style={[dashStyles.statusValue, { color: "#444" }]}>—</Text>
        </View>
      </View>
    </View>
  );
}

const dashStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 12,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  connBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  connText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  demoBtn: {
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 4,
  },
  demoBtnActive: {
    borderColor: "#FF1801",
    backgroundColor: "rgba(255,24,1,0.08)",
  },
  demoBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1,
  },
  demoBtnTextActive: {
    color: "#FF1801",
  },
  centerSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  speedBlock: {
    alignItems: "center",
    flex: 1,
  },
  speedLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  speedValue: {
    fontSize: 72,
    fontWeight: "200",
    color: "#FFF",
    letterSpacing: -4,
    fontVariant: ["tabular-nums"] as const,
    lineHeight: 76,
  },
  gearBlock: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  gearLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  gearValue: {
    fontSize: 80,
    fontWeight: "700",
    lineHeight: 84,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -2,
  },
  lapBlock: {
    alignItems: "flex-end",
    flex: 1,
  },
  lapLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  lapValue: {
    fontSize: 20,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  lastLapValue: {
    fontSize: 11,
    fontWeight: "500",
    color: "#555",
    fontVariant: ["tabular-nums"] as const,
    marginTop: 2,
  },
  rpmSection: {
    gap: 4,
  },
  rpmLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  rpmLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 1.5,
  },
  rpmValue: {
    fontSize: 18,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  rpmMax: {
    fontSize: 12,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
  },
  rpmTrack: {
    height: 14,
    backgroundColor: "#0a0a0a",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    position: "relative",
  },
  rpmFill: {
    height: "100%",
    borderRadius: 2,
  },
  rpmMarker: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  rpmTicks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 0,
  },
  rpmTick: {
    fontSize: 8,
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
    width: 24,
    textAlign: "center",
  },
  gaugeGrid: {
    gap: 10,
  },
  statusRow: {
    flexDirection: "row",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  statusCell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#1a1a1a",
  },
  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1.5,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
});

function LapTimerScreen() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<number[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const lapStartRef = useRef(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [pulseAnim]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    startRef.current = now - elapsed;
    lapStartRef.current = now - (laps.reduce((a, b) => a + b, 0));
    setRunning(true);
    startPulse();
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 50);
  }, [elapsed, laps, startPulse]);

  const handleStop = useCallback(() => {
    setRunning(false);
    stopPulse();
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, [stopPulse]);

  const handleLap = useCallback(() => {
    const now = Date.now();
    const lapTime = now - lapStartRef.current;
    setLaps((prev) => [lapTime, ...prev]);
    lapStartRef.current = now;
  }, []);

  const handleReset = useCallback(() => {
    handleStop();
    setElapsed(0);
    setLaps([]);
    startRef.current = 0;
    lapStartRef.current = 0;
  }, [handleStop]);

  const bestLap = laps.length > 0 ? Math.min(...laps) : null;
  const lapElapsed = elapsed - laps.reduce((a, b) => a + b, 0);

  return (
    <ScrollView style={lapStyles.container} showsVerticalScrollIndicator={false}>
      <View style={lapStyles.clockBlock}>
        <View style={lapStyles.clockHeader}>
          <Animated.View style={[lapStyles.liveDot, { transform: [{ scale: pulseAnim }], opacity: running ? 1 : 0 }]} />
          <Text style={lapStyles.clockHeaderText}>{running ? "LIVE" : "LAP TIMER"}</Text>
        </View>
        <Text style={lapStyles.clockDisplay}>{formatTimeColon(elapsed)}</Text>
        {laps.length > 0 && running && (
          <Text style={lapStyles.currentLap}>
            LAP {laps.length + 1} &nbsp;·&nbsp; {formatTime(lapElapsed)}
          </Text>
        )}
        <View style={lapStyles.controls}>
          <TouchableOpacity
            style={[lapStyles.sideBtn, (elapsed === 0 || running) && lapStyles.btnDisabled]}
            onPress={handleReset}
            disabled={elapsed === 0 || running}
            activeOpacity={0.7}
          >
            <RotateCcw size={20} color={elapsed === 0 || running ? "#2a2a2a" : "#888"} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[lapStyles.mainBtn, running && lapStyles.mainBtnStop]}
            onPress={running ? handleStop : handleStart}
            activeOpacity={0.85}
          >
            {running
              ? <Square size={22} fill="#fff" color="#fff" strokeWidth={0} />
              : <Play size={24} fill="#000" color="#000" strokeWidth={0} />
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[lapStyles.sideBtn, !running && lapStyles.btnDisabled]}
            onPress={handleLap}
            disabled={!running}
            activeOpacity={0.7}
          >
            <Flag size={20} color={running ? "#fff" : "#2a2a2a"} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {laps.length > 0 && (
        <View style={lapStyles.lapsSection}>
          <View style={lapStyles.lapsHeader}>
            <Text style={lapStyles.lapsTitle}>LAP TIMES</Text>
            {bestLap !== null && (
              <View style={lapStyles.bestBadge}>
                <TrendingUp size={11} color="#34C759" strokeWidth={2} />
                <Text style={lapStyles.bestBadgeText}>BEST {formatTime(bestLap)}</Text>
              </View>
            )}
          </View>
          {laps.map((lap, i) => {
            const lapNum = laps.length - i;
            const isBest = lap === bestLap;
            const isWorst = laps.length > 2 && lap === Math.max(...laps);
            return (
              <View key={i} style={[lapStyles.lapRow, isBest && lapStyles.lapRowBest]}>
                <Text style={lapStyles.lapNum}>L{String(lapNum).padStart(2, "0")}</Text>
                <Text style={[lapStyles.lapTime, isBest && { color: "#34C759" }, isWorst && !isBest && { color: "#FF3B30" }]}>
                  {formatTime(lap)}
                </Text>
                {isBest && <View style={lapStyles.bestPill}><Text style={lapStyles.bestPillText}>BEST</Text></View>}
              </View>
            );
          })}
        </View>
      )}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const lapStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  clockBlock: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    gap: 6,
  },
  clockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF1801",
  },
  clockHeaderText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  clockDisplay: {
    fontSize: 64,
    fontWeight: "100",
    color: "#FFF",
    letterSpacing: -2,
    fontVariant: ["tabular-nums"] as const,
  },
  currentLap: {
    fontSize: 13,
    color: "#555",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"] as const,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 28,
    marginTop: 16,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  mainBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  mainBtnStop: {
    backgroundColor: "#FF1801",
    shadowColor: "#FF1801",
    shadowOpacity: 0.4,
  },
  lapsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 0,
  },
  lapsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  lapsTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  bestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52,199,89,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 0.5,
  },
  lapRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
    gap: 16,
  },
  lapRowBest: {
    backgroundColor: "rgba(52,199,89,0.04)",
  },
  lapNum: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
    width: 36,
    fontVariant: ["tabular-nums"] as const,
  },
  lapTime: {
    flex: 1,
    fontSize: 20,
    fontWeight: "300",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -0.5,
  },
  bestPill: {
    backgroundColor: "rgba(52,199,89,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  bestPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#34C759",
    letterSpacing: 1,
  },
});

function PlaceholderScreen({
  icon,
  title,
  subtitle,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tag: string;
}) {
  return (
    <View style={phStyles.root}>
      <View style={phStyles.iconWrap}>{icon}</View>
      <View style={phStyles.tagWrap}>
        <Text style={phStyles.tag}>{tag}</Text>
      </View>
      <Text style={phStyles.title}>{title}</Text>
      <Text style={phStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const phStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tagWrap: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tag: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFF",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#444",
    textAlign: "center",
    lineHeight: 20,
  },
});

const RACE_TABS: { id: RaceTab; label: string; short: string }[] = [
  { id: "dash", label: "Digital Dash", short: "DASH" },
  { id: "timer", label: "Lap Timer", short: "TIMER" },
  { id: "tracks", label: "Tracks", short: "TRACKS" },
  { id: "tuning", label: "Tuning", short: "TUNING" },
  { id: "pit", label: "PIT", short: "PIT" },
];

export default function RaceScreen() {
  const [activeTab, setActiveTab] = useState<RaceTab>("dash");
  const scrollRef = useRef<ScrollView>(null);

  const renderContent = () => {
    switch (activeTab) {
      case "dash":
        return <DigitalDashScreen />;
      case "timer":
        return <LapTimerScreen />;
      case "tracks":
        return (
          <PlaceholderScreen
            icon={<MapPin size={32} color="#333" strokeWidth={1.5} />}
            title="Track Maps"
            subtitle="Pre-loaded known tracks and user-recorded boundary data. GPS lap trigger points and outline mapping coming soon."
            tag="COMING SOON"
          />
        );
      case "tuning":
        return (
          <PlaceholderScreen
            icon={<Wrench size={32} color="#333" strokeWidth={1.5} />}
            title="Tuning Console"
            subtitle="Exhaustive granular engine and chassis tuning parameters. Live ECU write-back and logging in development."
            tag="COMING SOON"
          />
        );
      case "pit":
        return (
          <PlaceholderScreen
            icon={<Radio size={32} color="#333" strokeWidth={1.5} />}
            title="Reycin PIT Manager"
            subtitle="Real-time vehicle-to-pit communication via ESP32+GPS primary with phone GPS fallback. Pit wall telemetry dashboard in development."
            tag="COMING SOON"
          />
        );
    }
  };

  return (
    <View style={mainStyles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={mainStyles.tabBar}
        contentContainerStyle={mainStyles.tabBarContent}
      >
        {RACE_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[mainStyles.tab, isActive && mainStyles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              testID={`race-tab-${tab.id}`}
            >
              <Text style={[mainStyles.tabText, isActive && mainStyles.tabTextActive]}>
                {tab.short}
              </Text>
              {isActive && <View style={mainStyles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={mainStyles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const mainStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  tabBarContent: {
    flexDirection: "row",
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 1.5,
  },
  tabTextActive: {
    color: "#FFF",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "#FF1801",
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
});
