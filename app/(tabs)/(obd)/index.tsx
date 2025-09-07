import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { theme } from "@/constants/theme";
import { Wifi, Bluetooth, Usb, Activity, AlertTriangle, Settings, FileText, Cpu } from "lucide-react-native";
import { router } from "expo-router";
import { useOBD } from "@/providers/OBDProvider";
import { Platform } from "react-native";

export default function OBDScreen() {
  const { connectionStatus, connectionType, telemetry, activeDTCs } = useOBD();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return theme.colors.success;
      case "connecting": return theme.colors.warning;
      case "error": return theme.colors.error;
      default: return theme.colors.textGray;
    }
  };

  const getConnectionIcon = () => {
    switch (connectionType) {
      case "wifi": return Wifi;
      case "ble": return Bluetooth;
      case "usb": return Usb;
      default: return Activity;
    }
  };

  const ConnectionIcon = getConnectionIcon();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Connection Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <ConnectionIcon size={24} color={getStatusColor()} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {connectionStatus === "connected" ? "Connected" : 
             connectionStatus === "connecting" ? "Connecting..." : 
             "Disconnected"}
          </Text>
        </View>
        
        {connectionStatus === "connected" && telemetry && (
          <View style={styles.quickStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{telemetry.rpm || 0}</Text>
              <Text style={styles.statLabel}>RPM</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{telemetry.ect_c || 0}°C</Text>
              <Text style={styles.statLabel}>Coolant</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{telemetry.vbat?.toFixed(1) || 0}V</Text>
              <Text style={styles.statLabel}>Battery</Text>
            </View>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.connectButton}
          onPress={() => {}}
        >
          <Text style={styles.connectButtonText}>
            {connectionStatus === "connected" ? "CHANGE CONNECTION" : "CONNECT DEVICE"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/(tabs)/(obd)/live-data')}
        >
          <Activity size={32} color={theme.colors.white} strokeWidth={1.5} />
          <Text style={styles.actionTitle}>Live Data</Text>
          <Text style={styles.actionDescription}>Real-time telemetry</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => {}}
        >
          <View>
            <AlertTriangle size={32} color={theme.colors.white} strokeWidth={1.5} />
            {activeDTCs.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeDTCs.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.actionTitle}>Fault Codes</Text>
          <Text style={styles.actionDescription}>
            {activeDTCs.length > 0 ? `${activeDTCs.length} active` : "No faults"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => {}}
        >
          <Settings size={32} color={theme.colors.white} strokeWidth={1.5} />
          <Text style={styles.actionTitle}>Actuations</Text>
          <Text style={styles.actionDescription}>Control systems</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => {}}
        >
          <FileText size={32} color={theme.colors.white} strokeWidth={1.5} />
          <Text style={styles.actionTitle}>Session Logs</Text>
          <Text style={styles.actionDescription}>View history</Text>
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Compatible Devices</Text>
        <View style={styles.infoCard}>
          <Wifi size={20} color={theme.colors.textGray} />
          <View style={styles.infoContent}>
            <Text style={styles.infoName}>Reycin Link Wi-Fi</Text>
            <Text style={styles.infoDescription}>ESP32-based OBD adapter</Text>
          </View>
        </View>
        
        <View style={styles.infoCard}>
          <Bluetooth size={20} color={theme.colors.textGray} />
          <View style={styles.infoContent}>
            <Text style={styles.infoName}>Reycin Link BLE</Text>
            <Text style={styles.infoDescription}>Bluetooth Low Energy adapter</Text>
          </View>
        </View>
        
        {Platform.OS === "android" && (
          <View style={styles.infoCard}>
            <Usb size={20} color={theme.colors.textGray} />
            <View style={styles.infoContent}>
              <Text style={styles.infoName}>Reycin Link USB-C</Text>
              <Text style={styles.infoDescription}>Direct USB connection</Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  statusCard: {
    backgroundColor: theme.colors.darkGray,
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "600",
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: theme.spacing.lg,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.colors.white,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textGray,
    marginTop: 4,
  },
  connectButton: {
    backgroundColor: theme.colors.white,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
  },
  connectButtonText: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  actionCard: {
    width: "47%",
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.white,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: theme.colors.textGray,
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  infoSection: {
    padding: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.white,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.darkGray,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderGray,
  },
  infoContent: {
    flex: 1,
  },
  infoName: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.white,
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 12,
    color: theme.colors.textGray,
  },
});