import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

import { ref, set, push } from "firebase/database";
import { database } from "@/config/firebase";
import { useAuth } from "@/providers/AuthProvider";

type ConnectionType = "ble" | "wifi" | "usb" | null;
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface TelemetryData {
  t: number;
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

  const wsRef = useRef<WebSocket | null>(null);
  const telemetryBuffer = useRef<TelemetryData[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleMessage = useCallback((msg: Record<string, any>) => {
    console.log("[OBD] Message:", msg.type);
    switch (msg.type) {
      case "connected":
        setFirmwareVersion(msg.version ?? null);
        sendCommand({ command: "set_poll_rate", rate: pollRateRef.current });
        break;
      case "telemetry": {
        const data: TelemetryData = {
          t: msg.timestamp || Date.now(),
          rpm: msg.rpm,
          ect_c: msg.ect_c,
          iat_c: msg.iat_c,
          map_kpa: msg.map_kpa,
          vbat: msg.vbat,
          speed_kmh: msg.speed_kmh,
          throttle_pct: msg.throttle_pct,
          engine_load: msg.engine_load,
          stft: msg.stft,
          ltft: msg.ltft,
          o2_voltage: msg.o2_voltage,
          fuel_status: msg.fuel_status,
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
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    setConnectionStatus("disconnected");
    setConnectionType(null);
  }, []);

  useEffect(() => {
    const openWS = (type: ConnectionType) => {
      if (!type) return;
      if (type === "wifi") {
        const ws = new WebSocket("ws://192.168.4.1:81");
        ws.onopen = () => {
          console.log("[OBD] WebSocket connected");
          setConnectionStatus("connected");
          wsRef.current = ws;
        };
        ws.onmessage = (event) => {
          try {
            handleMessage(JSON.parse(event.data));
          } catch (e) {
            console.error("[OBD] Parse error:", e);
          }
        };
        ws.onerror = () => {
          setConnectionStatus("error");
        };
        ws.onclose = () => {
          console.log("[OBD] WebSocket closed");
          setConnectionStatus("disconnected");
          wsRef.current = null;
          scheduleReconnect();
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
    setConnectionType(type);
    setConnectionStatus("connecting");
    try {
      if (openWSRef.current) openWSRef.current(type);
    } catch (error) {
      console.error("[OBD] Connection failed:", error);
      setConnectionStatus("error");
      scheduleReconnect();
    }
  }, [scheduleReconnect]);

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
  }, [user]);

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
  }, [uploadTelemetryBatch]);

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
    connect, disconnect, readDTCs, clearDTCs, sendActuation, sendRaw,
    setPollRate, startSession, stopSession,
  ]);
});
