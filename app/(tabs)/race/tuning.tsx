import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Wifi,
  WifiOff,
  Thermometer,
  Zap,
  Activity,
  AlertTriangle,
  Terminal,
  ChevronUp,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Trash2,
  Send,
  CircleCheck,
  CircleX,
  AlertCircle,
  Gauge,
  Droplets,
  Wind,
  FlaskConical,
} from "lucide-react-native";
import { useOBD } from "@/providers/OBDProvider";
import type { TelemetryData, DTC } from "@/providers/OBDProvider";

type TuningTab = "sensors" | "fuel" | "thermal" | "actuators" | "diagnostics" | "console";

type SensorTier = "base" | "performance" | "expanded";
type SensorStatus = "normal" | "warning" | "critical" | "offline";

interface SensorDef {
  id: string;
  pid: string;
  label: string;
  sublabel: string;
  unit: string;
  tier: SensorTier;
  required: boolean;
  normalMin: number;
  normalMax: number;
  warnMin: number;
  warnMax: number;
  precision: number;
  getValue: (t: TelemetryData | null) => number | null;
}

const SENSOR_DEFS: SensorDef[] = [
  {
    id: "rpm", pid: "010C", label: "RPM", sublabel: "Engine Speed",
    unit: "rpm", tier: "base", required: true,
    normalMin: 800, normalMax: 7000, warnMin: 7000, warnMax: 8500,
    precision: 0, getValue: (t) => t?.rpm ?? null,
  },
  {
    id: "ect", pid: "0105", label: "ECT", sublabel: "Coolant Temp",
    unit: "°C", tier: "base", required: true,
    normalMin: 70, normalMax: 105, warnMin: 105, warnMax: 115,
    precision: 0, getValue: (t) => t?.ect_c ?? null,
  },
  {
    id: "throttle", pid: "0111", label: "TPS", sublabel: "Throttle Position",
    unit: "%", tier: "base", required: true,
    normalMin: 0, normalMax: 100, warnMin: 98, warnMax: 100,
    precision: 0, getValue: (t) => t?.throttle_pct ?? null,
  },
  {
    id: "vbat", pid: "0142", label: "VBAT", sublabel: "Battery Voltage",
    unit: "V", tier: "base", required: true,
    normalMin: 12.5, normalMax: 14.5, warnMin: 14.5, warnMax: 16,
    precision: 1, getValue: (t) => t?.vbat ?? null,
  },
  {
    id: "map", pid: "010B", label: "MAP", sublabel: "Manifold Pressure",
    unit: "kPa", tier: "performance", required: true,
    normalMin: 10, normalMax: 200, warnMin: 200, warnMax: 255,
    precision: 0, getValue: (t) => t?.map_kpa ?? null,
  },
  {
    id: "load", pid: "0104", label: "LOAD", sublabel: "Engine Load",
    unit: "%", tier: "performance", required: true,
    normalMin: 0, normalMax: 100, warnMin: 85, warnMax: 100,
    precision: 0, getValue: (t) => t?.engine_load ?? null,
  },
  {
    id: "iat", pid: "010F", label: "IAT", sublabel: "Intake Air Temp",
    unit: "°C", tier: "expanded", required: false,
    normalMin: -10, normalMax: 50, warnMin: 50, warnMax: 70,
    precision: 0, getValue: (t) => t?.iat_c ?? null,
  },
  {
    id: "stft", pid: "0106", label: "STFT", sublabel: "Short Term Fuel Trim",
    unit: "%", tier: "expanded", required: false,
    normalMin: -10, normalMax: 10, warnMin: 10, warnMax: 25,
    precision: 1, getValue: (t) => t?.stft ?? null,
  },
  {
    id: "ltft", pid: "0107", label: "LTFT", sublabel: "Long Term Fuel Trim",
    unit: "%", tier: "expanded", required: false,
    normalMin: -10, normalMax: 10, warnMin: 10, warnMax: 25,
    precision: 1, getValue: (t) => t?.ltft ?? null,
  },
  {
    id: "o2", pid: "0114", label: "O2", sublabel: "Oxygen Sensor",
    unit: "V", tier: "expanded", required: false,
    normalMin: 0.1, normalMax: 0.9, warnMin: 0.9, warnMax: 1.1,
    precision: 3, getValue: (t) => t?.o2_voltage ?? null,
  },
];

const ACTUATORS = [
  {
    id: "fan_main",
    label: "Main Cooling Fan",
    sublabel: "Primary radiator fan — Mode 08 0801/0800",
    caution: false,
  },
  {
    id: "pump_aux",
    label: "Auxiliary Pump",
    sublabel: "Secondary fluid circulation — Mode 08 0803/0802",
    caution: true,
  },
];

const DTC_LOOKUP: Record<string, string> = {
  P0100: "Mass Air Flow Sensor Circuit",
  P0101: "MAF Sensor Range / Performance",
  P0105: "MAP Sensor Circuit",
  P0106: "MAP Sensor Range / Performance",
  P0110: "IAT Sensor Circuit",
  P0111: "IAT Sensor Range / Performance",
  P0115: "ECT Sensor Circuit",
  P0116: "ECT Sensor Range / Performance",
  P0120: "Throttle Position Sensor A Circuit",
  P0121: "TPS A Range / Performance",
  P0130: "O2 Sensor Circuit B1S1",
  P0131: "O2 Sensor Low Voltage B1S1",
  P0132: "O2 Sensor High Voltage B1S1",
  P0133: "O2 Sensor Slow Response B1S1",
  P0134: "O2 Sensor No Activity B1S1",
  P0171: "System Too Lean Bank 1",
  P0172: "System Too Rich Bank 1",
  P0201: "Injector Circuit Open — Cyl 1",
  P0202: "Injector Circuit Open — Cyl 2",
  P0203: "Injector Circuit Open — Cyl 3",
  P0204: "Injector Circuit Open — Cyl 4",
  P0300: "Random / Multiple Cylinder Misfire",
  P0301: "Cylinder 1 Misfire Detected",
  P0302: "Cylinder 2 Misfire Detected",
  P0303: "Cylinder 3 Misfire Detected",
  P0304: "Cylinder 4 Misfire Detected",
  P0335: "Crankshaft Position Sensor A Circuit",
  P0340: "Camshaft Position Sensor A Circuit",
  P0420: "Catalyst Efficiency Below Threshold B1",
  P0441: "EVAP System Incorrect Purge Flow",
  P0442: "EVAP System Small Leak",
  P0455: "EVAP System Large Leak",
  P0500: "Vehicle Speed Sensor",
  P0560: "System Voltage Malfunction",
  P0601: "Internal Control Module Memory Fault",
  P0605: "Internal Control Module ROM Error",
  P0700: "Transmission Control System MIL",
};

function getSensorStatus(sensor: SensorDef, value: number): SensorStatus {
  if (Math.abs(value) > sensor.warnMax) return "critical";
  if (value > sensor.warnMin || value < sensor.normalMin) return "warning";
  return "normal";
}

const STATUS_COLORS: Record<SensorStatus, string> = {
  normal: "#34C759",
  warning: "#FFD600",
  critical: "#FF1801",
  offline: "#333",
};

function TierBadge({ tier }: { tier: SensorTier }) {
  const label = tier === "base" ? "BASE" : tier === "performance" ? "PERF" : "EXT";
  const color = tier === "base" ? "#00B4FF" : tier === "performance" ? "#FF9500" : "#8E8E93";
  return (
    <View style={[sensorStyles.tierBadge, { borderColor: color + "55" }]}>
      <Text style={[sensorStyles.tierText, { color }]}>{label}</Text>
    </View>
  );
}

function SensorRow({
  sensor,
  value,
  enabled,
  onToggle,
}: {
  sensor: SensorDef;
  value: number | null;
  enabled: boolean;
  onToggle?: () => void;
}) {
  const status: SensorStatus = value !== null && enabled ? getSensorStatus(sensor, value) : "offline";
  const dotColor = STATUS_COLORS[status];
  const displayValue = value !== null ? value.toFixed(sensor.precision) : "—";
  const valueColor = status === "offline" ? "#333" : STATUS_COLORS[status];

  return (
    <View style={sensorStyles.row}>
      <View style={[sensorStyles.statusDot, { backgroundColor: dotColor }]} />
      <View style={sensorStyles.rowInfo}>
        <Text style={sensorStyles.rowLabel}>{sensor.label}</Text>
        <Text style={sensorStyles.rowSub}>{sensor.sublabel}</Text>
      </View>
      <TierBadge tier={sensor.tier} />
      <Text style={[sensorStyles.rowValue, { color: valueColor }]}>
        {enabled ? displayValue : "—"}
        {enabled && value !== null && (
          <Text style={sensorStyles.rowUnit}> {sensor.unit}</Text>
        )}
      </Text>
      {!sensor.required && onToggle && (
        <TouchableOpacity onPress={onToggle} style={sensorStyles.toggleBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          {enabled ? (
            <ToggleRight size={22} color="#FF1801" strokeWidth={1.5} />
          ) : (
            <ToggleLeft size={22} color="#333" strokeWidth={1.5} />
          )}
        </TouchableOpacity>
      )}
      {sensor.required && (
        <View style={sensorStyles.lockedBadge}>
          <Text style={sensorStyles.lockedText}>REQ</Text>
        </View>
      )}
    </View>
  );
}

function ConnectionBanner({
  onConnect,
  onDisconnect,
}: {
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { connectionStatus, firmwareVersion, isConnected } = useOBD();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (connectionStatus === "connecting") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    }
  }, [connectionStatus, pulseAnim]);

  const statusColor =
    connectionStatus === "connected" ? "#34C759" :
    connectionStatus === "connecting" ? "#FFD600" :
    connectionStatus === "error" ? "#FF1801" : "#444";

  const statusLabel =
    connectionStatus === "connected" ? "CONNECTED" :
    connectionStatus === "connecting" ? "CONNECTING…" :
    connectionStatus === "error" ? "ERROR" : "DISCONNECTED";

  return (
    <View style={bannerStyles.root}>
      <Animated.View style={[bannerStyles.dot, { backgroundColor: statusColor, opacity: pulseAnim }]} />
      <View style={bannerStyles.info}>
        <Text style={[bannerStyles.status, { color: statusColor }]}>{statusLabel}</Text>
        {firmwareVersion && isConnected && (
          <Text style={bannerStyles.fw}>FW {firmwareVersion}  ·  192.168.4.1:81</Text>
        )}
        {!isConnected && (
          <Text style={bannerStyles.fw}>ws://192.168.4.1:81</Text>
        )}
      </View>
      {isConnected ? (
        <TouchableOpacity style={bannerStyles.btnDanger} onPress={onDisconnect} activeOpacity={0.75}>
          <WifiOff size={12} color="#FF1801" strokeWidth={2} />
          <Text style={bannerStyles.btnDangerText}>DISCONNECT</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[bannerStyles.btnConnect, connectionStatus === "connecting" && bannerStyles.btnDisabled]}
          onPress={onConnect}
          activeOpacity={0.75}
          disabled={connectionStatus === "connecting"}
        >
          <Wifi size={12} color="#000" strokeWidth={2} />
          <Text style={bannerStyles.btnConnectText}>
            {connectionStatus === "connecting" ? "CONNECTING…" : "CONNECT"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SensorsTab({
  enabledOptional,
  onToggleOptional,
}: {
  enabledOptional: Set<string>;
  onToggleOptional: (id: string) => void;
}) {
  const { telemetry, pollRate, setPollRate } = useOBD();

  const baseSensors = SENSOR_DEFS.filter((s) => s.tier === "base");
  const perfSensors = SENSOR_DEFS.filter((s) => s.tier === "performance");
  const expandedSensors = SENSOR_DEFS.filter((s) => s.tier === "expanded");

  return (
    <ScrollView style={tabContentStyles.scroll} showsVerticalScrollIndicator={false}>
      <View style={tabContentStyles.section}>
        <View style={tabContentStyles.sectionHeaderRow}>
          <Text style={tabContentStyles.sectionLabel}>POLL RATE</Text>
          <View style={pollStyles.controls}>
            <TouchableOpacity
              style={pollStyles.btn}
              onPress={() => setPollRate(pollRate - 1)}
              activeOpacity={0.7}
            >
              <ChevronDown size={14} color="#888" strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={pollStyles.value}>{pollRate} Hz</Text>
            <TouchableOpacity
              style={pollStyles.btn}
              onPress={() => setPollRate(pollRate + 1)}
              activeOpacity={0.7}
            >
              <ChevronUp size={14} color="#888" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={tabContentStyles.rateTrack}>
          {[1, 5, 10, 15, 20].map((v) => (
            <TouchableOpacity
              key={v}
              style={[tabContentStyles.rateChip, pollRate === v && tabContentStyles.rateChipActive]}
              onPress={() => setPollRate(v)}
              activeOpacity={0.7}
            >
              <Text style={[tabContentStyles.rateChipText, pollRate === v && tabContentStyles.rateChipTextActive]}>
                {v}Hz
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <SensorGroup label="BASE OPERATION" sublabel="Required — always active" sensors={baseSensors} telemetry={telemetry} enabledOptional={enabledOptional} onToggle={onToggleOptional} />
      <SensorGroup label="PERFORMANCE OPERATION" sublabel="Required — engine management" sensors={perfSensors} telemetry={telemetry} enabledOptional={enabledOptional} onToggle={onToggleOptional} />
      <SensorGroup label="EXTENDED SENSORS" sublabel="Optional — toggle per hardware availability" sensors={expandedSensors} telemetry={telemetry} enabledOptional={enabledOptional} onToggle={onToggleOptional} />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SensorGroup({
  label,
  sublabel,
  sensors,
  telemetry,
  enabledOptional,
  onToggle,
}: {
  label: string;
  sublabel: string;
  sensors: SensorDef[];
  telemetry: TelemetryData | null;
  enabledOptional: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={tabContentStyles.section}>
      <Text style={tabContentStyles.sectionLabel}>{label}</Text>
      <Text style={tabContentStyles.sectionSub}>{sublabel}</Text>
      <View style={tabContentStyles.card}>
        {sensors.map((sensor, i) => {
          const enabled = sensor.required || enabledOptional.has(sensor.id);
          const value = sensor.getValue(telemetry);
          return (
            <View key={sensor.id}>
              <SensorRow
                sensor={sensor}
                value={value}
                enabled={enabled}
                onToggle={!sensor.required ? () => onToggle(sensor.id) : undefined}
              />
              {i < sensors.length - 1 && <View style={tabContentStyles.divider} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FuelTab({ enabledOptional }: { enabledOptional: Set<string> }) {
  const { telemetry } = useOBD();

  const stft = telemetry?.stft ?? null;
  const ltft = telemetry?.ltft ?? null;
  const o2 = telemetry?.o2_voltage ?? null;
  const fuelStatus = telemetry?.fuel_status ?? null;

  const lambda = o2 !== null ? (o2 / 0.45).toFixed(3) : null;
  const afr = lambda !== null ? (parseFloat(lambda) * 14.7).toFixed(2) : null;

  const stftEnabled = enabledOptional.has("stft");
  const ltftEnabled = enabledOptional.has("ltft");
  const o2Enabled = enabledOptional.has("o2");

  function trimColor(v: number | null): string {
    if (v === null) return "#444";
    if (Math.abs(v) > 10) return "#FFD600";
    if (Math.abs(v) > 20) return "#FF1801";
    return "#34C759";
  }

  return (
    <ScrollView style={tabContentStyles.scroll} showsVerticalScrollIndicator={false}>
      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>FUEL STATUS</Text>
        <View style={tabContentStyles.card}>
          <View style={fuelStyles.statusRow}>
            <FlaskConical size={18} color="#FF9500" strokeWidth={1.5} />
            <View style={fuelStyles.statusInfo}>
              <Text style={fuelStyles.statusLabel}>LOOP STATUS</Text>
              <Text style={fuelStyles.statusValue}>{fuelStatus ?? "—"}</Text>
            </View>
            <View style={fuelStyles.afrBlock}>
              <Text style={fuelStyles.afrLabel}>AFR</Text>
              <Text style={fuelStyles.afrValue}>{afr ?? "—"}</Text>
            </View>
            <View style={fuelStyles.lambdaBlock}>
              <Text style={fuelStyles.lambdaLabel}>λ</Text>
              <Text style={fuelStyles.lambdaValue}>{lambda ?? "—"}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>FUEL TRIMS</Text>
        <Text style={tabContentStyles.sectionSub}>
          {!stftEnabled && !ltftEnabled ? "Enable STFT and LTFT sensors in the Sensors tab." : "Deviation from stoich — ideal range ±10%"}
        </Text>
        <View style={tabContentStyles.card}>
          <FuelTrimRow
            label="STFT"
            sublabel="Short Term Fuel Trim"
            value={stft}
            enabled={stftEnabled}
            color={trimColor(stft)}
          />
          <View style={tabContentStyles.divider} />
          <FuelTrimRow
            label="LTFT"
            sublabel="Long Term Fuel Trim"
            value={ltft}
            enabled={ltftEnabled}
            color={trimColor(ltft)}
          />
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>OXYGEN SENSOR (O2 B1S1)</Text>
        <Text style={tabContentStyles.sectionSub}>
          {!o2Enabled ? "Enable O2 sensor in the Sensors tab." : "0.1–0.4V = lean  ·  0.6–0.9V = rich  ·  ~0.45V = stoich"}
        </Text>
        <View style={tabContentStyles.card}>
          <View style={fuelStyles.o2Row}>
            <View style={fuelStyles.o2Meter}>
              <View style={fuelStyles.o2LabelRow}>
                <Text style={fuelStyles.o2Label}>O2 VOLTAGE</Text>
                <Text style={[fuelStyles.o2Value, { color: o2Enabled && o2 !== null ? "#FF9500" : "#333" }]}>
                  {o2Enabled && o2 !== null ? o2.toFixed(3) + " V" : "—"}
                </Text>
              </View>
              <O2Bar value={o2Enabled ? o2 : null} />
              <View style={fuelStyles.o2Legend}>
                <Text style={fuelStyles.o2LegendText}>LEAN</Text>
                <Text style={fuelStyles.o2LegendMid}>STOICH</Text>
                <Text style={fuelStyles.o2LegendText}>RICH</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>REYCIN GTR250R FUEL NOTES</Text>
        <View style={tabContentStyles.card}>
          {[
            ["Recommended Fuel", "91+ RON (Premium Unleaded)"],
            ["Stoich Target AFR", "14.7 : 1"],
            ["WOT Target AFR", "12.5 – 13.0 : 1"],
            ["Idle AFR", "14.5 – 15.5 : 1"],
            ["Max Trim Deviation", "±10% STFT / ±5% LTFT"],
            ["O2 Cycle Frequency", "1–2 Hz at operating temp"],
          ].map(([key, val], i, arr) => (
            <View key={key}>
              <View style={fuelStyles.noteRow}>
                <Text style={fuelStyles.noteKey}>{key}</Text>
                <Text style={fuelStyles.noteVal}>{val}</Text>
              </View>
              {i < arr.length - 1 && <View style={tabContentStyles.divider} />}
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function FuelTrimRow({
  label,
  sublabel,
  value,
  enabled,
  color,
}: {
  label: string;
  sublabel: string;
  value: number | null;
  enabled: boolean;
  color: string;
}) {
  const barAnim = useRef(new Animated.Value(0.5)).current;
  const displayPct = enabled && value !== null ? (value + 100) / 200 : 0.5;

  useEffect(() => {
    Animated.timing(barAnim, { toValue: displayPct, duration: 120, useNativeDriver: false }).start();
  }, [displayPct, barAnim]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={fuelStyles.trimRow}>
      <View style={fuelStyles.trimLabelCol}>
        <Text style={fuelStyles.trimLabel}>{label}</Text>
        <Text style={fuelStyles.trimSub}>{sublabel}</Text>
      </View>
      <View style={fuelStyles.trimRight}>
        <Text style={[fuelStyles.trimValue, { color: enabled ? color : "#333" }]}>
          {enabled && value !== null ? (value >= 0 ? "+" : "") + value.toFixed(1) + "%" : "—"}
        </Text>
        <View style={fuelStyles.trimTrack}>
          <View style={fuelStyles.trimCenter} />
          <Animated.View style={[fuelStyles.trimFill, { width: barWidth, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function O2Bar({ value }: { value: number | null }) {
  const pct = value !== null ? Math.min(value / 1.275, 1) : 0.35;
  const barAnim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(barAnim, { toValue: pct, duration: 120, useNativeDriver: false }).start();
  }, [pct, barAnim]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const barColor = value !== null
    ? value < 0.35 ? "#00B4FF" : value > 0.6 ? "#FF9500" : "#34C759"
    : "#1a1a1a";

  return (
    <View style={fuelStyles.o2Track}>
      <Animated.View style={[fuelStyles.o2Fill, { width: barWidth, backgroundColor: barColor }]} />
      <View style={[fuelStyles.o2CenterLine]} />
    </View>
  );
}

function ThermalTab({
  ectWarn,
  ectCrit,
  onEctWarnChange,
  onEctCritChange,
}: {
  ectWarn: number;
  ectCrit: number;
  onEctWarnChange: (v: number) => void;
  onEctCritChange: (v: number) => void;
}) {
  const { telemetry, sendActuation } = useOBD();
  const [fanOn, setFanOn] = useState(false);

  const ect = telemetry?.ect_c ?? null;
  const iat = telemetry?.iat_c ?? null;

  const ectStatus: SensorStatus =
    ect === null ? "offline" :
    ect >= ectCrit ? "critical" :
    ect >= ectWarn ? "warning" : "normal";

  const iatStatus: SensorStatus =
    iat === null ? "offline" :
    iat >= 60 ? "critical" :
    iat >= 45 ? "warning" : "normal";

  const ectPct = ect !== null ? Math.min((ect + 40) / 255, 1) : 0;

  const handleFanToggle = useCallback((val: boolean) => {
    setFanOn(val);
    sendActuation("fan_main", val);
  }, [sendActuation]);

  return (
    <ScrollView style={tabContentStyles.scroll} showsVerticalScrollIndicator={false}>
      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>ENGINE COOLANT TEMP (ECT)</Text>
        <View style={tabContentStyles.card}>
          <View style={thermalStyles.bigTempRow}>
            <Thermometer size={28} color={STATUS_COLORS[ectStatus]} strokeWidth={1.5} />
            <View style={thermalStyles.bigTempInfo}>
              <Text style={[thermalStyles.bigTempValue, { color: STATUS_COLORS[ectStatus] }]}>
                {ect !== null ? `${ect}°C` : "—"}
              </Text>
              <View style={thermalStyles.bigTempBadge}>
                <Text style={[thermalStyles.bigTempStatus, { color: STATUS_COLORS[ectStatus] }]}>
                  {ect === null ? "OFFLINE" :
                    ect >= ectCrit ? "CRITICAL" :
                    ect >= ectWarn ? "WARNING" :
                    ect < 70 ? "COLD" : "NORMAL"}
                </Text>
              </View>
            </View>
          </View>

          <View style={thermalStyles.gradientTrack}>
            <View style={thermalStyles.gradientFill}>
              <View style={[thermalStyles.gradientZone, { flex: 3, backgroundColor: "#00B4FF22" }]} />
              <View style={[thermalStyles.gradientZone, { flex: 4, backgroundColor: "#34C75922" }]} />
              <View style={[thermalStyles.gradientZone, { flex: 2, backgroundColor: "#FFD60022" }]} />
              <View style={[thermalStyles.gradientZone, { flex: 1, backgroundColor: "#FF180122" }]} />
            </View>
            <View style={[thermalStyles.tempNeedle, { left: `${ectPct * 100}%` as any }]} />
          </View>
          <View style={thermalStyles.zoneLabels}>
            <Text style={thermalStyles.zoneText}>COLD</Text>
            <Text style={thermalStyles.zoneText}>NORMAL</Text>
            <Text style={thermalStyles.zoneText}>WARN</Text>
            <Text style={thermalStyles.zoneText}>CRIT</Text>
          </View>
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>TEMPERATURE THRESHOLDS</Text>
        <Text style={tabContentStyles.sectionSub}>Alert triggers — does not modify ECU tables</Text>
        <View style={tabContentStyles.card}>
          <ThresholdRow
            label="WARNING THRESHOLD"
            value={ectWarn}
            unit="°C"
            color="#FFD600"
            onDecrement={() => onEctWarnChange(Math.max(80, ectWarn - 1))}
            onIncrement={() => onEctWarnChange(Math.min(ectCrit - 1, ectWarn + 1))}
          />
          <View style={tabContentStyles.divider} />
          <ThresholdRow
            label="CRITICAL THRESHOLD"
            value={ectCrit}
            unit="°C"
            color="#FF1801"
            onDecrement={() => onEctCritChange(Math.max(ectWarn + 1, ectCrit - 1))}
            onIncrement={() => onEctCritChange(Math.min(130, ectCrit + 1))}
          />
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>INTAKE AIR TEMP (IAT)</Text>
        <View style={tabContentStyles.card}>
          <View style={thermalStyles.simpleRow}>
            <Wind size={16} color={STATUS_COLORS[iatStatus]} strokeWidth={1.5} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={thermalStyles.simpleLabel}>Intake Air Temperature</Text>
              <Text style={thermalStyles.simpleSub}>PID 010F — optional sensor</Text>
            </View>
            <Text style={[thermalStyles.simpleValue, { color: STATUS_COLORS[iatStatus] }]}>
              {iat !== null ? `${iat}°C` : "—"}
            </Text>
          </View>
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>COOLING FAN OVERRIDE</Text>
        <Text style={tabContentStyles.sectionSub}>Direct actuator command — Mode 08</Text>
        <View style={tabContentStyles.card}>
          <View style={thermalStyles.fanRow}>
            <View style={thermalStyles.fanInfo}>
              <Text style={thermalStyles.fanLabel}>MAIN COOLING FAN</Text>
              <Text style={thermalStyles.fanSub}>fan_main  ·  OBD Mode 08 0801/0800</Text>
            </View>
            <Switch
              value={fanOn}
              onValueChange={handleFanToggle}
              trackColor={{ false: "#1a1a1a", true: "rgba(255,24,1,0.4)" }}
              thumbColor={fanOn ? "#FF1801" : "#444"}
            />
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ThresholdRow({
  label,
  value,
  unit,
  color,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <View style={thermalStyles.threshRow}>
      <View style={[thermalStyles.threshDot, { backgroundColor: color }]} />
      <Text style={thermalStyles.threshLabel}>{label}</Text>
      <View style={thermalStyles.threshControls}>
        <TouchableOpacity style={thermalStyles.threshBtn} onPress={onDecrement} activeOpacity={0.7}>
          <ChevronDown size={14} color="#666" strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[thermalStyles.threshValue, { color }]}>{value}{unit}</Text>
        <TouchableOpacity style={thermalStyles.threshBtn} onPress={onIncrement} activeOpacity={0.7}>
          <ChevronUp size={14} color="#666" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ActuatorsTab() {
  const { sendActuation, isConnected } = useOBD();
  const [states, setStates] = useState<Record<string, boolean>>({
    fan_main: false,
    pump_aux: false,
  });

  const handleToggle = useCallback((id: string, val: boolean) => {
    setStates((prev) => ({ ...prev, [id]: val }));
    sendActuation(id, val);
  }, [sendActuation]);

  return (
    <ScrollView style={tabContentStyles.scroll} showsVerticalScrollIndicator={false}>
      <View style={tabContentStyles.section}>
        <View style={actuatorStyles.warningBanner}>
          <AlertTriangle size={14} color="#FFD600" strokeWidth={2} />
          <Text style={actuatorStyles.warningText}>
            Actuator commands are sent directly to vehicle systems via OBD Mode 08.
            Only activate when the vehicle is safely stationary unless otherwise directed.
          </Text>
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>MODE 08 — OUTPUT CONTROLS</Text>
        <Text style={tabContentStyles.sectionSub}>Direct ECU output actuation</Text>
        <View style={tabContentStyles.card}>
          {ACTUATORS.map((act, i) => (
            <View key={act.id}>
              <View style={actuatorStyles.row}>
                <View style={actuatorStyles.rowLeft}>
                  <View style={[actuatorStyles.indicator, states[act.id] && actuatorStyles.indicatorOn]} />
                  <View style={actuatorStyles.rowInfo}>
                    <Text style={actuatorStyles.rowLabel}>{act.label}</Text>
                    <Text style={actuatorStyles.rowSub}>{act.sublabel}</Text>
                    {act.caution && (
                      <View style={actuatorStyles.cautionBadge}>
                        <AlertCircle size={9} color="#FFD600" strokeWidth={2} />
                        <Text style={actuatorStyles.cautionText}>CAUTION</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={actuatorStyles.rowRight}>
                  <Text style={[actuatorStyles.stateLabel, states[act.id] && actuatorStyles.stateLabelOn]}>
                    {states[act.id] ? "ON" : "OFF"}
                  </Text>
                  <Switch
                    value={states[act.id]}
                    onValueChange={(val) => handleToggle(act.id, val)}
                    disabled={!isConnected}
                    trackColor={{ false: "#1a1a1a", true: "rgba(255,24,1,0.4)" }}
                    thumbColor={states[act.id] ? "#FF1801" : "#333"}
                  />
                </View>
              </View>
              {i < ACTUATORS.length - 1 && <View style={tabContentStyles.divider} />}
            </View>
          ))}
        </View>
      </View>

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>FIRMWARE EXPANSION SLOTS</Text>
        <View style={tabContentStyles.card}>
          {["0805 / 0804", "0807 / 0806", "0809 / 0808"].map((cmd, i, arr) => (
            <View key={cmd}>
              <View style={actuatorStyles.slotRow}>
                <View style={actuatorStyles.slotDot} />
                <View style={{ flex: 1 }}>
                  <Text style={actuatorStyles.slotLabel}>Mode 08  {cmd}</Text>
                  <Text style={actuatorStyles.slotSub}>Unassigned — reserved for future actuator mapping</Text>
                </View>
                <Text style={actuatorStyles.slotBadge}>—</Text>
              </View>
              {i < arr.length - 1 && <View style={tabContentStyles.divider} />}
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function DiagnosticsTab() {
  const { activeDTCs, readDTCs, clearDTCs, isConnected } = useOBD();
  const [scanning, setScanning] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const handleScan = useCallback(() => {
    if (!isConnected) return;
    setScanning(true);
    readDTCs();
    setTimeout(() => setScanning(false), 2000);
  }, [isConnected, readDTCs]);

  const handleClear = useCallback(() => {
    if (!clearConfirm) {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 4000);
      return;
    }
    clearDTCs();
    setClearConfirm(false);
  }, [clearConfirm, clearDTCs]);

  const dtcCount = activeDTCs.length;

  return (
    <ScrollView style={tabContentStyles.scroll} showsVerticalScrollIndicator={false}>
      <View style={tabContentStyles.section}>
        <View style={diagStyles.headerRow}>
          <View style={diagStyles.countBlock}>
            <Text style={[diagStyles.countNum, { color: dtcCount > 0 ? "#FF1801" : "#34C759" }]}>
              {dtcCount}
            </Text>
            <Text style={diagStyles.countLabel}>ACTIVE{"\n"}CODES</Text>
          </View>
          <View style={diagStyles.btnCol}>
            <TouchableOpacity
              style={[diagStyles.scanBtn, (!isConnected || scanning) && diagStyles.btnDisabled]}
              onPress={handleScan}
              disabled={!isConnected || scanning}
              activeOpacity={0.75}
            >
              <RefreshCw size={14} color={scanning ? "#555" : "#FFF"} strokeWidth={2} />
              <Text style={[diagStyles.scanBtnText, scanning && { color: "#555" }]}>
                {scanning ? "SCANNING…" : "READ CODES"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                diagStyles.clearBtn,
                clearConfirm && diagStyles.clearBtnConfirm,
                (!isConnected || dtcCount === 0) && diagStyles.btnDisabled,
              ]}
              onPress={handleClear}
              disabled={!isConnected || dtcCount === 0}
              activeOpacity={0.75}
            >
              <Trash2 size={14} color={clearConfirm ? "#FF1801" : "#666"} strokeWidth={2} />
              <Text style={[diagStyles.clearBtnText, clearConfirm && diagStyles.clearBtnTextConfirm]}>
                {clearConfirm ? "CONFIRM CLEAR" : "CLEAR CODES"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {dtcCount > 0 && (
        <View style={tabContentStyles.section}>
          <Text style={tabContentStyles.sectionLabel}>ACTIVE FAULT CODES</Text>
          <View style={tabContentStyles.card}>
            {activeDTCs.map((dtc: DTC, i) => {
              const desc = DTC_LOOKUP[dtc.code] ?? dtc.description ?? "Unknown fault code";
              return (
                <View key={dtc.code}>
                  <View style={diagStyles.dtcRow}>
                    <View style={diagStyles.dtcCodeBlock}>
                      <CircleX size={14} color="#FF1801" strokeWidth={2} />
                      <Text style={diagStyles.dtcCode}>{dtc.code}</Text>
                    </View>
                    <Text style={diagStyles.dtcDesc} numberOfLines={2}>{desc}</Text>
                  </View>
                  {i < activeDTCs.length - 1 && <View style={tabContentStyles.divider} />}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {dtcCount === 0 && (
        <View style={diagStyles.clearState}>
          <CircleCheck size={36} color="#1a1a1a" strokeWidth={1.5} />
          <Text style={diagStyles.clearStateTitle}>No Active Codes</Text>
          <Text style={diagStyles.clearStateSub}>
            {isConnected
              ? "System scan returned no active fault codes."
              : "Connect to OBD to scan for fault codes."}
          </Text>
        </View>
      )}

      <View style={tabContentStyles.section}>
        <Text style={tabContentStyles.sectionLabel}>OBD MODE REFERENCE</Text>
        <View style={tabContentStyles.card}>
          {[
            ["Mode 01", "Show current live data (PIDs)"],
            ["Mode 02", "Show freeze frame data"],
            ["Mode 03", "Show stored DTCs (command: 03)"],
            ["Mode 04", "Clear DTCs and reset MIL (command: 04)"],
            ["Mode 07", "Show pending DTCs"],
            ["Mode 08", "Output control / actuator test"],
            ["Mode 09", "Request vehicle info (VIN, etc.)"],
            ["Mode 0A", "Permanent DTC log"],
          ].map(([mode, desc], i, arr) => (
            <View key={mode}>
              <View style={diagStyles.modeRow}>
                <Text style={diagStyles.modeCode}>{mode}</Text>
                <Text style={diagStyles.modeDesc}>{desc}</Text>
              </View>
              {i < arr.length - 1 && <View style={tabContentStyles.divider} />}
            </View>
          ))}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ConsoleTab() {
  const { rawHistory, sendRaw, isConnected: consoleConnected } = useOBD();
  const [input, setInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const handleSend = useCallback(() => {
    if (!input.trim() || !consoleConnected) return;
    sendRaw(input.trim());
    setInput("");
  }, [input, sendRaw, consoleConnected]);

  const QUICK_CMDS = [
    { label: "RPM", cmd: "010C" },
    { label: "ECT", cmd: "0105" },
    { label: "IAT", cmd: "010F" },
    { label: "MAP", cmd: "010B" },
    { label: "TPS", cmd: "0111" },
    { label: "VBAT", cmd: "0142" },
    { label: "LOAD", cmd: "0104" },
    { label: "STFT", cmd: "0106" },
    { label: "LTFT", cmd: "0107" },
    { label: "O2", cmd: "0114" },
    { label: "VIN", cmd: "0902" },
    { label: "PIDS", cmd: "0100" },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={120}
    >
      <ScrollView
        style={tabContentStyles.scroll}
        showsVerticalScrollIndicator={false}
        ref={scrollRef}
      >
        <View style={tabContentStyles.section}>
          <Text style={tabContentStyles.sectionLabel}>QUICK COMMANDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={consoleStyles.quickScroll}>
            {QUICK_CMDS.map((q) => (
              <TouchableOpacity
                key={q.cmd}
                style={consoleStyles.quickBtn}
                onPress={() => setInput(q.cmd)}
                activeOpacity={0.7}
              >
                <Text style={consoleStyles.quickLabel}>{q.label}</Text>
                <Text style={consoleStyles.quickCmd}>{q.cmd}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={tabContentStyles.section}>
          <Text style={tabContentStyles.sectionLabel}>COMMAND HISTORY</Text>
          {rawHistory.length === 0 ? (
            <View style={consoleStyles.emptyHistory}>
              <Terminal size={28} color="#1a1a1a" strokeWidth={1.5} />
              <Text style={consoleStyles.emptyText}>No commands sent</Text>
            </View>
          ) : (
            <View style={consoleStyles.historyBlock}>
              {rawHistory.map((entry, i) => (
                <TouchableOpacity
                  key={`${entry.ts}-${i}`}
                  onPress={() => setInput(entry.cmd)}
                  activeOpacity={0.6}
                >
                  <View style={consoleStyles.historyRow}>
                    <Text style={consoleStyles.historyArrow}>→</Text>
                    <Text style={consoleStyles.historyCmd}>{entry.cmd}</Text>
                    <Text style={consoleStyles.historyResponse} numberOfLines={1}>
                      {entry.response}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={consoleStyles.inputBar}>
        <Text style={consoleStyles.inputPrompt}>{">"}</Text>
        <TextInput
          style={consoleStyles.input}
          value={input}
          onChangeText={(v) => setInput(v.toUpperCase())}
          placeholder="e.g. 010C"
          placeholderTextColor="#333"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          editable={consoleConnected}
        />
        <TouchableOpacity
          style={[consoleStyles.sendBtn, (!consoleConnected || !input.trim()) && consoleStyles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!consoleConnected || !input.trim()}
          activeOpacity={0.75}
        >
          <Send size={16} color={consoleConnected && input.trim() ? "#000" : "#333"} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const TUNING_TABS: { id: TuningTab; label: string; icon: React.ReactNode }[] = [
  { id: "sensors", label: "SENSORS", icon: <Activity size={14} color="currentColor" strokeWidth={2} /> },
  { id: "fuel", label: "FUEL", icon: <Droplets size={14} color="currentColor" strokeWidth={2} /> },
  { id: "thermal", label: "THERMAL", icon: <Thermometer size={14} color="currentColor" strokeWidth={2} /> },
  { id: "actuators", label: "ACTUATORS", icon: <Zap size={14} color="currentColor" strokeWidth={2} /> },
  { id: "diagnostics", label: "DIAG", icon: <Gauge size={14} color="currentColor" strokeWidth={2} /> },
  { id: "console", label: "CONSOLE", icon: <Terminal size={14} color="currentColor" strokeWidth={2} /> },
];

export default function TuningConsole() {
  const { connect, disconnect } = useOBD();
  const [activeTab, setActiveTab] = useState<TuningTab>("sensors");
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(
    new Set(["iat", "stft", "ltft", "o2"])
  );
  const [ectWarn, setEctWarn] = useState(105);
  const [ectCrit, setEctCrit] = useState(115);

  const handleToggleOptional = useCallback((id: string) => {
    setEnabledOptional((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConnect = useCallback(() => {
    void connect("wifi");
  }, [connect]);

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case "sensors":
        return <SensorsTab enabledOptional={enabledOptional} onToggleOptional={handleToggleOptional} />;
      case "fuel":
        return <FuelTab enabledOptional={enabledOptional} />;
      case "thermal":
        return (
          <ThermalTab
            ectWarn={ectWarn}
            ectCrit={ectCrit}
            onEctWarnChange={setEctWarn}
            onEctCritChange={setEctCrit}
          />
        );
      case "actuators":
        return <ActuatorsTab />;
      case "diagnostics":
        return <DiagnosticsTab />;
      case "console":
        return <ConsoleTab />;
    }
  }, [activeTab, enabledOptional, handleToggleOptional, ectWarn, ectCrit]);

  return (
    <View style={tuningStyles.root}>
      <ConnectionBanner onConnect={handleConnect} onDisconnect={disconnect} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={tuningStyles.tabBar}
        contentContainerStyle={tuningStyles.tabBarContent}
      >
        {TUNING_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[tuningStyles.tab, isActive && tuningStyles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              testID={`tuning-tab-${tab.id}`}
            >
              <Text style={[tuningStyles.tabText, isActive && tuningStyles.tabTextActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={tuningStyles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={tuningStyles.content}>{renderContent()}</View>
    </View>
  );
}

const tuningStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#111",
  },
  tabBarContent: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 1.5,
  },
  tabTextActive: { color: "#FFF" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: "#FF1801",
    borderRadius: 1,
  },
  content: { flex: 1 },
});

const bannerStyles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0d0d0d",
    gap: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  info: { flex: 1, gap: 2 },
  status: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  fw: {
    fontSize: 9,
    color: "#333",
    letterSpacing: 0.5,
    fontVariant: ["tabular-nums"] as const,
  },
  btnConnect: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  btnConnectText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 1,
  },
  btnDanger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#2a0a00",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  btnDangerText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FF1801",
    letterSpacing: 1,
  },
  btnDisabled: { opacity: 0.4 },
});

const tabContentStyles = StyleSheet.create({
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: 14,
    paddingTop: 18,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 2,
  },
  sectionSub: {
    fontSize: 10,
    color: "#2a2a2a",
    marginTop: -4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#141414",
    borderRadius: 10,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: "#111",
    marginHorizontal: 14,
  },
  rateTrack: {
    flexDirection: "row",
    gap: 6,
  },
  rateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    backgroundColor: "#080808",
  },
  rateChipActive: {
    borderColor: "#FF1801",
    backgroundColor: "rgba(255,24,1,0.08)",
  },
  rateChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#444",
    letterSpacing: 0.5,
  },
  rateChipTextActive: { color: "#FF1801" },
});

const pollStyles = StyleSheet.create({
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  btn: {
    width: 26,
    height: 26,
    borderRadius: 5,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    minWidth: 46,
    textAlign: "center",
  },
});

const sensorStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  rowSub: {
    fontSize: 10,
    color: "#444",
  },
  tierBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  tierText: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    minWidth: 56,
    textAlign: "right",
  },
  rowUnit: {
    fontSize: 9,
    color: "#444",
    fontWeight: "500",
  },
  toggleBtn: {
    marginLeft: 4,
  },
  lockedBadge: {
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    marginLeft: 4,
  },
  lockedText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
  },
});

const fuelStyles = StyleSheet.create({
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  statusInfo: { flex: 1 },
  statusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1.5,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
    marginTop: 2,
  },
  afrBlock: { alignItems: "center" },
  afrLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
  },
  afrValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF9500",
    fontVariant: ["tabular-nums"] as const,
  },
  lambdaBlock: { alignItems: "center", marginLeft: 12 },
  lambdaLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
  },
  lambdaValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
  },
  trimRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  trimLabelCol: { flex: 1, gap: 2 },
  trimLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  trimSub: { fontSize: 10, color: "#444" },
  trimRight: { flex: 1, gap: 6, alignItems: "flex-end" },
  trimValue: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
  },
  trimTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#111",
    borderRadius: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    position: "relative",
  },
  trimCenter: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#333",
    zIndex: 2,
  },
  trimFill: {
    height: "100%",
    borderRadius: 3,
    position: "absolute",
    left: 0,
    top: 0,
  },
  o2Row: { padding: 14 },
  o2Meter: { gap: 8 },
  o2LabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  o2Label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1.5,
  },
  o2Value: {
    fontSize: 15,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
  },
  o2Track: {
    height: 10,
    backgroundColor: "#111",
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    position: "relative",
  },
  o2Fill: {
    height: "100%",
    borderRadius: 5,
    position: "absolute",
    left: 0,
    top: 0,
  },
  o2CenterLine: {
    position: "absolute",
    left: "35%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  o2Legend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  o2LegendText: {
    fontSize: 8,
    color: "#333",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  o2LegendMid: {
    fontSize: 8,
    color: "#333",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  noteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  noteKey: {
    fontSize: 11,
    color: "#555",
  },
  noteVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFF",
    textAlign: "right",
    flex: 1,
  },
});

const thermalStyles = StyleSheet.create({
  bigTempRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  bigTempInfo: { flex: 1, gap: 5 },
  bigTempValue: {
    fontSize: 40,
    fontWeight: "200",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: -1,
  },
  bigTempBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  bigTempStatus: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  gradientTrack: {
    marginHorizontal: 14,
    marginBottom: 6,
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    position: "relative",
  },
  gradientFill: {
    flexDirection: "row",
    height: "100%",
  },
  gradientZone: {
    height: "100%",
  },
  tempNeedle: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 2,
    backgroundColor: "#FFF",
    borderRadius: 1,
    marginLeft: -1,
  },
  zoneLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  zoneText: {
    fontSize: 8,
    color: "#333",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  threshRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  threshDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  threshLabel: {
    flex: 1,
    fontSize: 11,
    color: "#666",
    letterSpacing: 0.5,
  },
  threshControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  threshBtn: {
    width: 26,
    height: 26,
    borderRadius: 5,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  threshValue: {
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    minWidth: 50,
    textAlign: "center",
  },
  simpleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  simpleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  simpleSub: {
    fontSize: 10,
    color: "#444",
    marginTop: 2,
  },
  simpleValue: {
    fontSize: 20,
    fontWeight: "600",
    fontVariant: ["tabular-nums"] as const,
  },
  fanRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  fanInfo: { flex: 1, gap: 3 },
  fanLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
  },
  fanSub: {
    fontSize: 10,
    color: "#444",
  },
});

const actuatorStyles = StyleSheet.create({
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,214,0,0.06)",
    borderWidth: 1,
    borderColor: "#2a2500",
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: "#888",
    lineHeight: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#222",
    marginTop: 4,
  },
  indicatorOn: {
    backgroundColor: "#FF1801",
    shadowColor: "#FF1801",
    shadowOpacity: 0.7,
    shadowRadius: 5,
  },
  rowInfo: { flex: 1, gap: 3 },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  rowSub: {
    fontSize: 9,
    color: "#444",
    letterSpacing: 0.3,
  },
  cautionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  cautionText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#FFD600",
    letterSpacing: 1,
  },
  rowRight: {
    alignItems: "center",
    gap: 4,
  },
  stateLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 1,
  },
  stateLabelOn: { color: "#FF1801" },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  slotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  slotLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#333",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.5,
  },
  slotSub: {
    fontSize: 9,
    color: "#222",
    marginTop: 2,
  },
  slotBadge: {
    fontSize: 16,
    color: "#222",
    fontWeight: "300",
  },
});

const diagStyles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  countBlock: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  countNum: {
    fontSize: 32,
    fontWeight: "700",
    fontVariant: ["tabular-nums"] as const,
    lineHeight: 36,
  },
  countLabel: {
    fontSize: 7,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1,
    textAlign: "center",
  },
  btnCol: {
    flex: 1,
    gap: 8,
  },
  scanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 7,
  },
  scanBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 1,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 7,
  },
  clearBtnConfirm: {
    borderColor: "#2a0a00",
    backgroundColor: "rgba(255,24,1,0.05)",
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#444",
    letterSpacing: 1,
  },
  clearBtnTextConfirm: { color: "#FF1801" },
  btnDisabled: { opacity: 0.35 },
  dtcRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  dtcCodeBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dtcCode: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF1801",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.5,
    minWidth: 50,
  },
  dtcDesc: {
    flex: 1,
    fontSize: 12,
    color: "#888",
    lineHeight: 17,
  },
  clearState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 24,
    gap: 10,
  },
  clearStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
    marginTop: 8,
  },
  clearStateSub: {
    fontSize: 12,
    color: "#1a1a1a",
    textAlign: "center",
    lineHeight: 18,
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  modeCode: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FF9500",
    fontVariant: ["tabular-nums"] as const,
    width: 60,
    letterSpacing: 0.5,
  },
  modeDesc: {
    flex: 1,
    fontSize: 11,
    color: "#555",
  },
});

const consoleStyles = StyleSheet.create({
  quickScroll: {
    flexGrow: 0,
    marginBottom: 4,
  },
  quickBtn: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 6,
    alignItems: "center",
    gap: 2,
    minWidth: 52,
  },
  quickLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 1,
  },
  quickCmd: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FF9500",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.5,
  },
  emptyHistory: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    color: "#1a1a1a",
  },
  historyBlock: {
    backgroundColor: "#040404",
    borderWidth: 1,
    borderColor: "#0d0d0d",
    borderRadius: 8,
    overflow: "hidden",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0a0a0a",
  },
  historyArrow: {
    fontSize: 11,
    color: "#FF1801",
    fontWeight: "700",
  },
  historyCmd: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.5,
    width: 52,
  },
  historyResponse: {
    flex: 1,
    fontSize: 11,
    color: "#444",
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 0.3,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#111",
    backgroundColor: "#040404",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  inputPrompt: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF1801",
  },
  input: {
    flex: 1,
    height: 38,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 6,
    paddingHorizontal: 12,
    color: "#FFF",
    fontSize: 13,
    fontVariant: ["tabular-nums"] as const,
    letterSpacing: 1,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
  },
});
