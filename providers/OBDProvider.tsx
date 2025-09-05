import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import { ref, set, push, serverTimestamp } from "firebase/database";
import { database } from "@/config/firebase";
import { useAuth } from "@/providers/AuthProvider";

type ConnectionType = "ble" | "wifi" | "usb" | null;
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface TelemetryData {
  t: number;
  rpm?: number;
  ect_c?: number;
  iat_c?: number;
  map_kpa?: number;
  vbat?: number;
  speed_kmh?: number;
  throttle_pct?: number;
}

interface DTC {
  code: string;
  description?: string;
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const telemetryBuffer = useRef<TelemetryData[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async (type: ConnectionType) => {
    if (!type) return;
    
    setConnectionType(type);
    setConnectionStatus("connecting");
    
    try {
      if (type === "wifi") {
        await connectWebSocket();
      } else if (type === "ble") {
        await connectBLE();
      } else if (type === "usb" && Platform.OS === "android") {
        await connectUSB();
      }
    } catch (error) {
      console.error("Connection failed:", error);
      setConnectionStatus("error");
      scheduleReconnect();
    }
  };

  const connectWebSocket = async () => {
    const ws = new WebSocket("ws://192.168.4.1/ws"); // ESP32 AP default
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      wsRef.current = ws;
      
      // Send initial handshake
      ws.send(JSON.stringify({ type: "connect", profile: "default" }));
    };
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnectionStatus("error");
    };
    
    ws.onclose = () => {
      console.log("WebSocket closed");
      setConnectionStatus("disconnected");
      wsRef.current = null;
      scheduleReconnect();
    };
  };

  const connectBLE = async () => {
    // BLE implementation stub
    console.log("BLE connection not yet implemented");
    setConnectionStatus("error");
  };

  const connectUSB = async () => {
    // USB Serial implementation stub
    console.log("USB Serial connection not yet implemented");
    setConnectionStatus("error");
  };

  const disconnect = () => {
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
  };

  const scheduleReconnect = () => {
    if (reconnectTimer.current) return;
    
    reconnectTimer.current = setTimeout(() => {
      reconnectTimer.current = null;
      if (connectionType && connectionStatus !== "connected") {
        connect(connectionType);
      }
    }, 3000);
  };

  const handleMessage = (msg: any) => {
    switch (msg.type) {
      case "hello":
        setFirmwareVersion(msg.fw);
        startPolling();
        break;
        
      case "telemetry":
        const data: TelemetryData = {
          t: msg.t || Date.now(),
          rpm: msg.rpm,
          ect_c: msg.ect_c,
          iat_c: msg.iat_c,
          map_kpa: msg.map_kpa,
          vbat: msg.vbat,
          speed_kmh: msg.speed_kmh,
          throttle_pct: msg.throttle_pct,
        };
        setTelemetry(data);
        
        if (isRecording && currentSession) {
          telemetryBuffer.current.push(data);
          
          // Batch upload every 10 samples
          if (telemetryBuffer.current.length >= 10) {
            uploadTelemetryBatch();
          }
        }
        break;
        
      case "dtc":
        setActiveDTCs(msg.active || []);
        setPendingDTCs(msg.pending || []);
        break;
        
      case "ack":
        console.log("Command acknowledged:", msg.id);
        break;
        
      case "error":
        console.error("OBD Error:", msg.code, msg.detail);
        break;
    }
  };

  const startPolling = () => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({
      type: "poll.start",
      rateHz: 10,
      pids: ["0C", "05", "0F", "2F", "10", "42"],
    }));
  };

  const stopPolling = () => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({ type: "poll.stop" }));
  };

  const readDTCs = () => {
    if (!wsRef.current) return;
    
    wsRef.current.send(JSON.stringify({ type: "dtc.read" }));
  };

  const clearDTCs = () => {
    if (!wsRef.current) return;
    if (!profile || !["tech", "engineer"].includes(profile.role)) {
      console.error("Insufficient permissions to clear DTCs");
      return;
    }
    
    wsRef.current.send(JSON.stringify({ type: "dtc.clear" }));
  };

  const sendActuation = (command: string, value: number) => {
    if (!wsRef.current) return;
    if (!profile || !["tech", "engineer"].includes(profile.role)) {
      console.error("Insufficient permissions for actuations");
      return;
    }
    
    wsRef.current.send(JSON.stringify({
      type: "mode08",
      command,
      value,
    }));
  };

  const startSession = async (vehicleId: string, notes?: string) => {
    if (!user) return;
    
    const session: OBDSession = {
      vehicleId,
      startedAt: Date.now(),
      profile: "default",
      notes,
    };
    
    // Create session in Firebase
    const sessionRef = push(ref(database, "reycinUSA/obd/sessions"));
    session.id = sessionRef.key || undefined;
    
    await set(sessionRef, {
      ...session,
      uid: user.uid,
    });
    
    setCurrentSession(session);
    setIsRecording(true);
    telemetryBuffer.current = [];
  };

  const stopSession = async () => {
    if (!currentSession || !currentSession.id) return;
    
    setIsRecording(false);
    
    // Upload remaining telemetry
    if (telemetryBuffer.current.length > 0) {
      await uploadTelemetryBatch();
    }
    
    // Update session with end time and summary
    const sessionRef = ref(database, `reycinUSA/obd/sessions/${currentSession.id}`);
    await set(sessionRef, {
      ...currentSession,
      endedAt: Date.now(),
      logSummary: {
        samples: telemetryBuffer.current.length,
        durationSec: Math.floor((Date.now() - currentSession.startedAt) / 1000),
      },
    });
    
    setCurrentSession(null);
    telemetryBuffer.current = [];
  };

  const uploadTelemetryBatch = async () => {
    if (!currentSession?.id || telemetryBuffer.current.length === 0) return;
    
    const batch = telemetryBuffer.current.splice(0, 10);
    const logRef = ref(database, `reycinUSA/obd/sessionLogs/${currentSession.id}`);
    
    const updates: Record<string, TelemetryData> = {};
    batch.forEach((data) => {
      updates[`t_${data.t}`] = data;
    });
    
    await set(logRef, updates);
  };

  return {
    connectionType,
    connectionStatus,
    telemetry,
    activeDTCs,
    pendingDTCs,
    currentSession,
    isRecording,
    firmwareVersion,
    connect,
    disconnect,
    readDTCs,
    clearDTCs,
    sendActuation,
    startSession,
    stopSession,
    isConnected: connectionStatus === "connected",
  };
});