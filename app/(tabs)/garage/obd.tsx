import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { Activity, Wifi, Bluetooth, AlertTriangle, Radio, Square } from "lucide-react-native";
import { useOBD } from "@/providers/OBDProvider";

export default function VehicleOBDScreen() {
  const { vehicleId, vehicleName } = useLocalSearchParams<{ vehicleId: string; vehicleName: string }>();
  const {
    connectionStatus,
    connectionType,
    telemetry,
    activeDTCs,
    isConnected,
    isRecording,
    currentSession,
    firmwareVersion,
    connect,
    disconnect,
    readDTCs,
    clearDTCs,
    startSession,
    stopSession,
  } = useOBD();

  const [showConnectMenu, setShowConnectMenu] = useState(false);

  const statusColor =
    connectionStatus === "connected" ? "#10B981" :
    connectionStatus === "connecting" ? "#F59E0B" :
    connectionStatus === "error" ? "#EF4444" :
    theme.colors.textGray;

  const statusLabel =
    connectionStatus === "connected" ? "Connected" :
    connectionStatus === "connecting" ? "Connecting..." :
    connectionStatus === "error" ? "Connection Error" :
    "Disconnected";

  const handleConnect = (type: "wifi" | "ble") => {
    setShowConnectMenu(false);
    void connect(type);
  };

  const handleDisconnect = () => {
    Alert.alert("Disconnect", "Disconnect from OBD device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Disconnect", style: "destructive", onPress: disconnect },
    ]);
  };

  const handleToggleSession = async () => {
    if (!vehicleId) return;
    if (isRecording) {
      await stopSession();
    } else {
      await startSession(vehicleId, `Session for ${vehicleName ?? vehicleId}`);
    }
  };

  const handleClearDTCs = () => {
    Alert.alert("Clear Fault Codes", "This will clear all active fault codes. Continue?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearDTCs },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: vehicleName ? `OBD — ${vehicleName}` : "OBD Diagnostics" }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.vehicleBanner}>
          <Radio size={14} color={theme.colors.textGray} strokeWidth={1.8} />
          <Text style={styles.vehicleBannerText}>
            {vehicleName ?? "Vehicle"} — Diagnostics
          </Text>
          {firmwareVersion && (
            <Text style={styles.firmwareText}>fw {firmwareVersion}</Text>
          )}
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            {connectionType && (
              <View style={styles.connectionTypeBadge}>
                {connectionType === "wifi" ? (
                  <Wifi size={12} color={theme.colors.textGray} />
                ) : (
                  <Bluetooth size={12} color={theme.colors.textGray} />
                )}
                <Text style={styles.connectionTypeText}>{connectionType.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {isConnected && telemetry && (
            <View style={styles.telemetryGrid}>
              <TelemetryCell label="RPM" value={telemetry.rpm?.toLocaleString() ?? "—"} />
              <TelemetryCell label="Coolant" value={telemetry.ect_c !== undefined ? `${telemetry.ect_c}°C` : "—"} />
              <TelemetryCell label="Intake" value={telemetry.iat_c !== undefined ? `${telemetry.iat_c}°C` : "—"} />
              <TelemetryCell label="Battery" value={telemetry.vbat !== undefined ? `${telemetry.vbat.toFixed(1)}V` : "—"} />
              <TelemetryCell label="Speed" value={telemetry.speed_kmh !== undefined ? `${telemetry.speed_kmh} km/h` : "—"} />
              <TelemetryCell label="Throttle" value={telemetry.throttle_pct !== undefined ? `${telemetry.throttle_pct}%` : "—"} />
              <TelemetryCell label="MAP" value={telemetry.map_kpa !== undefined ? `${telemetry.map_kpa} kPa` : "—"} />
            </View>
          )}

          {!isConnected && !showConnectMenu && (
            <TouchableOpacity style={styles.connectBtn} onPress={() => setShowConnectMenu(true)} activeOpacity={0.8}>
              <Text style={styles.connectBtnText}>CONNECT DEVICE</Text>
            </TouchableOpacity>
          )}

          {showConnectMenu && (
            <View style={styles.connectMenu}>
              <Text style={styles.connectMenuTitle}>Select Connection</Text>
              <TouchableOpacity style={styles.connectOption} onPress={() => handleConnect("wifi")} activeOpacity={0.75}>
                <Wifi size={20} color={theme.colors.white} strokeWidth={1.5} />
                <View style={styles.connectOptionText}>
                  <Text style={styles.connectOptionTitle}>Reycin Link Wi-Fi</Text>
                  <Text style={styles.connectOptionSub}>Connect via ESP32 access point</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.connectOption} onPress={() => handleConnect("ble")} activeOpacity={0.75}>
                <Bluetooth size={20} color={theme.colors.white} strokeWidth={1.5} />
                <View style={styles.connectOptionText}>
                  <Text style={styles.connectOptionTitle}>Reycin Link BLE</Text>
                  <Text style={styles.connectOptionSub}>Bluetooth Low Energy adapter</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowConnectMenu(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {isConnected && (
            <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect} activeOpacity={0.75}>
              <Text style={styles.disconnectBtnText}>DISCONNECT</Text>
            </TouchableOpacity>
          )}
        </View>

        {isConnected && (
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>Data Logging</Text>
              {isRecording && currentSession && (
                <View style={styles.recordingBadge}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>Recording</Text>
                </View>
              )}
            </View>
            <Text style={styles.sessionSub}>
              {isRecording
                ? "Telemetry is being logged to this vehicle's profile."
                : "Start a session to log OBD data to this vehicle's garage profile."}
            </Text>
            <TouchableOpacity
              style={[styles.sessionBtn, isRecording && styles.sessionBtnStop]}
              onPress={handleToggleSession}
              activeOpacity={0.8}
            >
              {isRecording ? (
                <>
                  <Square size={16} color={theme.colors.white} strokeWidth={2} fill={theme.colors.white} />
                  <Text style={styles.sessionBtnText}>STOP SESSION</Text>
                </>
              ) : (
                <>
                  <Activity size={16} color={theme.colors.black} strokeWidth={2} />
                  <Text style={[styles.sessionBtnText, { color: theme.colors.black }]}>START SESSION</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.dtcCard}>
          <View style={styles.dtcHeader}>
            <View style={styles.dtcTitleRow}>
              <AlertTriangle size={18} color={activeDTCs.length > 0 ? "#EF4444" : theme.colors.textGray} strokeWidth={1.8} />
              <Text style={styles.dtcTitle}>Fault Codes</Text>
              {activeDTCs.length > 0 && (
                <View style={styles.dtcBadge}>
                  <Text style={styles.dtcBadgeText}>{activeDTCs.length}</Text>
                </View>
              )}
            </View>
            {isConnected && (
              <TouchableOpacity onPress={readDTCs} style={styles.readDtcBtn}>
                <Text style={styles.readDtcBtnText}>Read</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeDTCs.length === 0 ? (
            <View style={styles.noDtc}>
              <Text style={styles.noDtcText}>No active fault codes</Text>
            </View>
          ) : (
            <View style={styles.dtcList}>
              {activeDTCs.map((dtc, i) => (
                <View key={i} style={styles.dtcRow}>
                  <Text style={styles.dtcCode}>{dtc.code}</Text>
                  {dtc.description && <Text style={styles.dtcDesc}>{dtc.description}</Text>}
                </View>
              ))}
              <TouchableOpacity style={styles.clearDtcBtn} onPress={handleClearDTCs} activeOpacity={0.75}>
                <Text style={styles.clearDtcBtnText}>Clear All Codes</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

function TelemetryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.telemetryCell}>
      <Text style={styles.telemetryCellValue}>{value}</Text>
      <Text style={styles.telemetryCellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  vehicleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderGray,
  },
  vehicleBannerText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textGray,
    fontWeight: "500",
  },
  firmwareText: {
    fontSize: 11,
    color: theme.colors.textGray,
    fontFamily: "monospace" as any,
  },
  statusCard: {
    margin: 16,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 20,
    gap: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  connectionTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  connectionTypeText: {
    fontSize: 11,
    color: theme.colors.textGray,
    fontWeight: "600",
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  telemetryCell: {
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    minWidth: 80,
    flex: 1,
  },
  telemetryCellValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.white,
  },
  telemetryCellLabel: {
    fontSize: 10,
    color: theme.colors.textGray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 3,
  },
  connectBtn: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  connectBtnText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  connectMenu: {
    gap: 10,
  },
  connectMenuTitle: {
    fontSize: 13,
    color: theme.colors.textGray,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  connectOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  connectOptionText: {
    flex: 1,
    gap: 2,
  },
  connectOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.white,
  },
  connectOptionSub: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  disconnectBtn: {
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  disconnectBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textGray,
    letterSpacing: 0.8,
  },
  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 20,
    gap: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.white,
  },
  recordingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  recordingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EF4444",
  },
  sessionSub: {
    fontSize: 13,
    color: theme.colors.textGray,
    lineHeight: 18,
  },
  sessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
  },
  sessionBtnStop: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  sessionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: theme.colors.white,
  },
  dtcCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
    padding: 20,
    gap: 12,
  },
  dtcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dtcTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dtcTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.white,
  },
  dtcBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  dtcBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  readDtcBtn: {
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  readDtcBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.white,
  },
  noDtc: {
    paddingVertical: 12,
    alignItems: "center",
  },
  noDtcText: {
    fontSize: 14,
    color: theme.colors.textGray,
  },
  dtcList: {
    gap: 8,
  },
  dtcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.lightGray,
    borderRadius: theme.borderRadius.sm,
    padding: 12,
  },
  dtcCode: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
    fontFamily: "monospace" as any,
    minWidth: 60,
  },
  dtcDesc: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textGray,
  },
  clearDtcBtn: {
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  clearDtcBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF4444",
  },
});
