import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import { ref, set, push } from "firebase/database";
import { database } from "@/config/firebase";
import { useAuth } from "@/providers/AuthProvider";

type ConnectionType = "ble" | "wifi" | "usb" | null;
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
export type FirmwareObdState = "absent" | "no_data" | "active" | null;
export type GpsSource = "esp32" | "phone" | null;

export interface GPSTelemetry {
  lat: number;
  lon: number;
  alt_m?: number;
  speed_kmh: number;
  heading?: number;
  sats?: number;
  utc?: string;
  source: "esp32" | "phone";
}

export interface TelemetryData {
  t: number;
  obd_state?: FirmwareObdState;
  gps?: GPSTelemetry;
  // OBD fields — undefined means sensor not reporting (not zero)
  rpm?: number;
  ect_c?: number;
  iat_c?: number;
  map_kpa?: number;
  vbat?: number;
  speed_kmh?: number;
  throttle_pct?: number;
  engine_load?: number;
  stft?: number;
  ltft?: number;
  o2_voltage?: number;
  fuel_status?: string;
}

export interface DTC {
  code: string;
  description?: string;
}

export interface RawEntry {
  cmd: string;
  response: string;
  ts: number;
}

interface OBDSession {
  id?: string;
  vehicleId: string;
  startedAt: number;
  endedAt?: number;
  profile: string;
  notes?: string;
  logSummary?: {
    samples: number;
    durationSec: number;
  };
}

export const [OBDProvider, useOBD] = createContextHook(() => {
  const { user, profile } = useAuth();
  const [connectionType, setConnectionType] = useState<ConnectionType>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [activeDTCs, setActiveDTCs] = useState<DTC[]>([]);
  const [pendingDTCs, setPendingDTCs] = useState<DTC[]>([]);
  const [currentSession, setCurrentSession] = useState<OBDSession | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);
  const [pollRate, setPollRateState] = useState(10);
  const [rawHistory, setRawHistory] = useState<RawEntry[]>([]);
  const [firmwareObdState, setFirmwareObdState] = useState<FirmwareObdState>(null);
  const [gpsSource, setGpsSource] = useState<GpsSource>(null);
  const [firmwareHasGPS, setFirmwareHasGPS] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const telemetryBuffer = useRef<TelemetryData[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phoneLocationRef = useRef<Location.LocationObject | null>(null);
  const locationWatcherRef = useRef<Location.LocationSubscription | null>(null);
  const lastESP32GpsTs = useRef<number>(0);

  const connectionTypeRef = useRef<ConnectionType>(null);
  const connectionStatusRef = useRef<ConnectionStatus>("disconnected");
  const pollRateRef = useRef(10);
  const isRecordingRef = useRef(false);
  const currentSessionRef = useRef<OBDSession | null>(null);

  const openWSRef = useRef<((type: ConnectionType) => void) | null>(null);

  useEffect(() => { connectionTypeRef.current = connectionType; }, [connectionType]);
  useEffect(() => { connectionStatusRef.current = connectionStatus; }, [connectionStatus]);
  useEffect(() => { pollRateRef.current = pollRate; }, [pollRate]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);

  const uploadTelemetryBatch = useCallback(async () => {
    const session = currentSessionRef.current;
    if (!session?.id || telemetryBuffer.current.length === 0) return;
    const batch = telemetryBuffer.current.splice(0, 10);
    const logRef = ref(database, `reycinUSA/obd/sessionLogs/${session.id}`);
    const updates: Record<string, TelemetryData> = {};
    batch.forEach((data) => { updates[`t_${data.t}`] = data; });
    await set(logRef, updates);
  }, []);

  const sendCommand = useCallback((payload: object): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[OBD] Cannot send — not connected");
      return false;
    }
    wsRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  // ── Phone GPS fallback ─────────────────────────────────────────────────────
  const startPhoneGPS = useCallback(async () => {
    if (Platform.OS === "web") {
      console.log("[GPS] Phone GPS not available on web");
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("[GPS] Phone GPS permission denied");
        return;
      }
      console.log("[GPS] Starting phone GPS fallback watcher");
      locationWatcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 2,
        },
        (loc) => {
          phoneLocationRef.current = loc;
          // Send phone GPS to firmware so it can include in mesh broadcasts
          sendCommand({
            command: "gps_update",
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            speed_kmh: (loc.coords.speed ?? 0) * 3.6,
            heading: loc.coords.heading ?? 0,
            alt_m: loc.coords.altitude ?? 0,
          });
        }
      );
    } catch (e) {
      console.error("[GPS] Phone GPS start error:", e);
    }
  }, [sendCommand]);

  const stopPhoneGPS = useCallback(() => {
    if (locationWatcherRef.current) {
      locationWatcherRef.current.remove();
      locationWatcherRef.current = null;
    }
    phoneLocationRef.current = null;
    console.log("[GPS] Phone GPS watcher stopped");
  }, []);

  // Start/stop phone GPS based on connection status and firmware GPS availability
  useEffect(() => {
    if (connectionStatus === "connected") {
      void startPhoneGPS();
    } else {
      stopPhoneGPS();
      setGpsSource(null);
    }
  }, [connectionStatus, startPhoneGPS, stopPhoneGPS]);

  // ── Message handler ────────────────────────────────────────────────────────
  const handleMessage = useCallback((msg: Record<string, any>) => {
    console.log("[OBD] Message type:", msg.type, "obd_state:", msg.obd_state ?? "n/a");

    switch (msg.type) {
      case "connected":
        setFirmwareVersion(msg.version ?? null);
        setFirmwareHasGPS(msg.gps_present === true);
        if (msg.obd_state) setFirmwareObdState(msg.obd_state as FirmwareObdState);
        sendCommand({ command: "set_poll_rate", rate: pollRateRef.current });
        console.log("[OBD] Firmware connected — version:", msg.version, "GPS present:", msg.gps_present, "OBD state:", msg.obd_state);
        break;

      case "telemetry": {
        // Update firmware OBD state
        if (msg.obd_state) setFirmwareObdState(msg.obd_state as FirmwareObdState);

        // ── GPS resolution ─────────────────────────────────────────────────
        let gpsPayload: GPSTelemetry | undefined;

        if (msg.gps && typeof msg.gps.lat === "number") {
          // ESP32 GPS is valid — use it
          lastESP32GpsTs.current = Date.now();
          gpsPayload = {
            lat: msg.gps.lat,
            lon: msg.gps.lon,
            alt_m: msg.gps.alt_m,
            speed_kmh: msg.gps.speed_kmh ?? 0,
            heading: msg.gps.heading,
            sats: msg.gps.sats,
            utc: msg.gps.utc,
            source: "esp32",
          };
          setGpsSource("esp32");
        } else if (phoneLocationRef.current) {
          // No ESP32 GPS — fall back to phone GPS
          const pl = phoneLocationRef.current;
          gpsPayload = {
            lat: pl.coords.latitude,
            lon: pl.coords.longitude,
            alt_m: pl.coords.altitude ?? undefined,
            speed_kmh: (pl.coords.speed ?? 0) * 3.6,
            heading: pl.coords.heading ?? undefined,
            source: "phone",
          };
          setGpsSource("phone");
        } else {
          setGpsSource(null);
        }

        // ── OBD fields — support both nested (v2 firmware) and flat (legacy) ──
        const obdBlock = msg.obd ?? msg; // nested takes priority, fall back to flat

        const data: TelemetryData = {
          t: msg.timestamp || Date.now(),
          obd_state: msg.obd_state ?? null,
          gps: gpsPayload,
          // Only include field if it's actually present (undefined = sensor offline)
          rpm: obdBlock.rpm !== undefined ? Number(obdBlock.rpm) : undefined,
          ect_c: obdBlock.ect_c !== undefined ? Number(obdBlock.ect_c) : undefined,
          iat_c: obdBlock.iat_c !== undefined ? Number(obdBlock.iat_c) : undefined,
          map_kpa: obdBlock.map_kpa !== undefined ? Number(obdBlock.map_kpa) : undefined,
          vbat: obdBlock.vbat !== undefined ? Number(obdBlock.vbat) : undefined,
          speed_kmh: obdBlock.speed_kmh !== undefined ? Number(obdBlock.speed_kmh) : undefined,
          throttle_pct: obdBlock.throttle_pct !== undefined ? Number(obdBlock.throttle_pct) : undefined,
          engine_load: obdBlock.engine_load !== undefined ? Number(obdBlock.engine_load) : undefined,
          stft: obdBlock.stft !== undefined ? Number(obdBlock.stft) : undefined,
          ltft: obdBlock.ltft !== undefined ? Number(obdBlock.ltft) : undefined,
          o2_voltage: obdBlock.o2_voltage !== undefined ? Number(obdBlock.o2_voltage) : undefined,
          fuel_status: obdBlock.fuel_status ?? undefined,
        };

        setTelemetry(data);

        if (isRecordingRef.current && currentSessionRef.current) {
          telemetryBuffer.current.push(data);
          if (telemetryBuffer.current.length >= 10) {
            void uploadTelemetryBatch();
          }
        }
        break;
      }

      case "status":
        if (msg.obd_state) setFirmwareObdState(msg.obd_state as FirmwareObdState);
        setFirmwareHasGPS(msg.gps_valid === true);
        console.log("[OBD] Status — obd:", msg.obd_state, "gps_valid:", msg.gps_valid, "sats:", msg.gps_sats);
        break;

      case "dtc_codes": {
        const dtcs: DTC[] = (msg.codes ?? []).map((code: string) => ({ code }));
        setActiveDTCs(dtcs);
        break;
      }

      case "dtc_cleared":
        setActiveDTCs([]);
        setPendingDTCs([]);
        break;

      case "raw_response":
        console.log("[OBD] Raw:", msg.command, "→", msg.response);
        setRawHistory((prev) => [
          { cmd: msg.command ?? "", response: msg.response ?? "", ts: Date.now() },
          ...prev.slice(0, 49),
        ]);
        break;

      default:
        console.log("[OBD] Unknown message type:", msg.type);
    }
  }, [sendCommand, uploadTelemetryBatch]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimer.current) return;
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      const ct = connectionTypeRef.current;
      const cs = connectionStatusRef.current;
      if (ct && cs !== "connected" && openWSRef.current) {
        openWSRef.current(ct);
      }
    }, 3000);
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus("disconnected");
    setConnectionType(null);
    setTelemetry(null);
    setFirmwareObdState(null);
    setGpsSource(null);
  }, []);

  useEffect(() => {
    const openWS = (type: ConnectionType) => {
      if (!type) return;

      // Tear down any existing socket cleanly before opening a new one
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      if (type === "wifi") {
        console.log("[OBD] Opening WebSocket — ws://192.168.4.1:81");
        const ws = new WebSocket("ws://192.168.4.1:81");
        let didOpen = false;

        // Assign immediately so disconnect() can close a pending socket
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("[OBD] WebSocket connected");
          didOpen = true;
          setConnectionStatus("connected");
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ command: "get_status" }));
            }
          }, 500);
        };

        ws.onmessage = (event) => {
          try {
            handleMessage(JSON.parse(event.data));
          } catch (e) {
            console.error("[OBD] Parse error:", e);
          }
        };

        ws.onerror = (e) => {
          // onclose always fires after onerror — handle status there to avoid double-set
          console.warn("[OBD] WebSocket error event", e);
        };

        ws.onclose = (e) => {
          console.log("[OBD] WebSocket closed — code:", e.code, "didOpen:", didOpen);
          wsRef.current = null;
          if (didOpen) {
            // Had a live session that dropped — try to auto-reconnect
            console.log("[OBD] Connection dropped — scheduling reconnect");
            setConnectionStatus("disconnected");
            scheduleReconnect();
          } else {
            // Never reached onopen — surface error so user can retry
            console.warn(
              "[OBD] Connection never established — code:",
              e.code,
              "| Verify device is on Reycin_VEH_ WiFi and disable mobile data"
            );
            setConnectionStatus("error");
          }
        };
      } else if (type === "ble" || type === "usb") {
        console.log(`[OBD] ${type} not yet implemented`);
        setConnectionStatus("error");
      }
    };
    openWSRef.current = openWS;
  }, [handleMessage, scheduleReconnect]);

  const connect = useCallback(async (type: ConnectionType) => {
    if (!type) return;
    // Cancel any scheduled reconnect before a fresh manual connect
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    setConnectionType(type);
    setConnectionStatus("connecting");
    try {
      if (openWSRef.current) openWSRef.current(type);
    } catch (error) {
      console.error("[OBD] Connection failed:", error);
      setConnectionStatus("error");
    }
  }, []);

  useEffect(() => {
    return () => { disconnect(); };
  }, [disconnect]);

  const readDTCs = useCallback(() => {
    sendCommand({ command: "get_dtc" });
  }, [sendCommand]);

  const clearDTCs = useCallback(() => {
    if (!profile || !["tech", "engineer"].includes((profile as any).role ?? "")) {
      console.warn("[OBD] Clearing DTCs — elevated role not confirmed");
    }
    sendCommand({ command: "clear_dtc" });
  }, [sendCommand, profile]);

  const sendActuation = useCallback((control: string, state: boolean) => {
    sendCommand({ command: "actuate", control, state });
  }, [sendCommand]);

  const sendRaw = useCallback((cmd: string) => {
    if (!cmd.trim()) return;
    const trimmed = cmd.trim().toUpperCase();
    console.log("[OBD] Raw command:", trimmed);
    setRawHistory((prev) => [
      { cmd: trimmed, response: "...", ts: Date.now() },
      ...prev.slice(0, 49),
    ]);
    sendCommand({ command: "raw_obd", cmd: trimmed });
  }, [sendCommand]);

  const setPollRate = useCallback((rate: number) => {
    const clamped = Math.min(20, Math.max(1, rate));
    setPollRateState(clamped);
    sendCommand({ command: "set_poll_rate", rate: clamped });
  }, [sendCommand]);

  const startSession = useCallback(async (vehicleId: string, notes?: string) => {
    if (!user) return;
    const session: OBDSession = { vehicleId, startedAt: Date.now(), profile: "default", notes };
    const sessionRef = push(ref(database, "reycinUSA/obd/sessions"));
    session.id = sessionRef.key || undefined;
    await set(sessionRef, { ...session, uid: user.uid });
    setCurrentSession(session);
    setIsRecording(true);
    telemetryBuffer.current = [];
    sendCommand({ command: "start_session" });
  }, [user, sendCommand]);

  const stopSession = useCallback(async () => {
    const session = currentSessionRef.current;
    if (!session?.id) return;
    setIsRecording(false);
    if (telemetryBuffer.current.length > 0) await uploadTelemetryBatch();
    const sessionRef = ref(database, `reycinUSA/obd/sessions/${session.id}`);
    await set(sessionRef, {
      ...session,
      endedAt: Date.now(),
      logSummary: {
        samples: telemetryBuffer.current.length,
        durationSec: Math.floor((Date.now() - session.startedAt) / 1000),
      },
    });
    setCurrentSession(null);
    telemetryBuffer.current = [];
    sendCommand({ command: "stop_session" });
  }, [uploadTelemetryBatch, sendCommand]);

  return useMemo(() => ({
    connectionType,
    connectionStatus,
    telemetry,
    activeDTCs,
    pendingDTCs,
    currentSession,
    isRecording,
    firmwareVersion,
    pollRate,
    rawHistory,
    firmwareObdState,
    gpsSource,
    firmwareHasGPS,
    connect,
    disconnect,
    readDTCs,
    clearDTCs,
    sendActuation,
    sendRaw,
    setPollRate,
    startSession,
    stopSession,
    isConnected: connectionStatus === "connected",
  }), [
    connectionType, connectionStatus, telemetry, activeDTCs, pendingDTCs,
    currentSession, isRecording, firmwareVersion, pollRate, rawHistory,
    firmwareObdState, gpsSource, firmwareHasGPS,
    connect, disconnect, readDTCs, clearDTCs, sendActuation, sendRaw,
    setPollRate, startSession, stopSession,
  ]);
});
