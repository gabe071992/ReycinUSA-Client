import createContextHook from "@nkzw/create-context-hook";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLapTimer } from "@/providers/LapTimerProvider";

export type FlagState = "green" | "yellow" | "red" | "sc" | "chequered" | null;
export type HubConnStatus = "disconnected" | "connecting" | "connected" | "error";
export type MsgPriority = "critical" | "high" | "normal" | "info";
export type MsgCategory = "strategy" | "instruction" | "reminder" | "warning" | "info";
export type MsgStatus = "unread" | "read" | "acknowledged";
export type PitLogType = "lap" | "flag" | "pit" | "comms" | "system";

export interface PitMessage {
  id: string;
  timestamp: string;
  priority: MsgPriority;
  category: MsgCategory;
  text: string;
  status: MsgStatus;
  sender: string;
}

export interface PitLogEntry {
  id: string;
  timestamp: string;
  type: PitLogType;
  text: string;
}

export interface VoiceEntry {
  id: string;
  timestamp: string;
  direction: "TX" | "RX";
  sender: string;
  durationMs: number;
}

const HUB_WS_DEFAULT = "ws://192.168.4.2:82";

function nowTimestamp(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function formatLapTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const cents = Math.floor((ms % 1000) / 10);
  return `${mins > 0 ? `${mins}:` : ""}${String(secs).padStart(2, "0")}.${String(cents).padStart(2, "0")}`;
}

function rssiToBars(rssi: number): number {
  if (rssi >= -60) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -80) return 2;
  return 1;
}

export const [PITProvider, usePIT] = createContextHook(() => {
  const { laps } = useLapTimer();

  const [hubStatus, setHubStatus] = useState<HubConnStatus>("disconnected");
  const [hubUrl, setHubUrl] = useState(HUB_WS_DEFAULT);
  const [rssi, setRssi] = useState<number | null>(null);
  const [signalBars, setSignalBars] = useState(0);
  const [activeFlag, setActiveFlag] = useState<FlagState>(null);
  const [messages, setMessages] = useState<PitMessage[]>([]);
  const [log, setLog] = useState<PitLogEntry[]>([]);
  const [voiceLog, setVoiceLog] = useState<VoiceEntry[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevLapsLen = useRef(laps.length);
  const hubStatusRef = useRef<HubConnStatus>("disconnected");
  const simPhaseRef = useRef(0);

  useEffect(() => { hubStatusRef.current = hubStatus; }, [hubStatus]);

  const appendLog = useCallback((entry: Omit<PitLogEntry, "id" | "timestamp">) => {
    const full: PitLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowTimestamp(),
      ...entry,
    };
    setLog((prev) => [full, ...prev].slice(0, 120));
    console.log(`[PIT] Log [${entry.type}]: ${entry.text}`);
  }, []);

  // ── Auto-log lap completions ───────────────────────────────────────────────
  useEffect(() => {
    if (laps.length > prevLapsLen.current) {
      const lapNum = laps.length;
      const lapTime = laps[0];
      appendLog({ type: "lap", text: `Lap ${lapNum} completed — ${formatLapTime(lapTime)}` });
    }
    prevLapsLen.current = laps.length;
  }, [laps, appendLog]);

  // ── WebSocket message handler ──────────────────────────────────────────────
  const handleHubMessage = useCallback((raw: Record<string, any>) => {
    console.log("[PIT] Hub message:", raw.type);

    switch (raw.type) {
      case "hub_connected": {
        const rssiVal = typeof raw.rssi === "number" ? raw.rssi : null;
        setRssi(rssiVal);
        setSignalBars(rssiVal !== null ? rssiToBars(rssiVal) : 4);
        appendLog({ type: "system", text: `Hub connected${rssiVal !== null ? ` — RSSI: ${rssiVal} dBm` : ""}` });
        break;
      }

      case "rssi_update": {
        const rssiVal = typeof raw.rssi === "number" ? raw.rssi : null;
        setRssi(rssiVal);
        if (rssiVal !== null) setSignalBars(rssiToBars(rssiVal));
        break;
      }

      case "pit_message": {
        const msg: PitMessage = {
          id: raw.id ?? `msg-${Date.now()}`,
          timestamp: raw.timestamp ?? nowTimestamp(),
          priority: (raw.priority as MsgPriority) ?? "normal",
          category: (raw.category as MsgCategory) ?? "info",
          text: raw.text ?? "",
          status: "unread",
          sender: raw.sender ?? "PIT",
        };
        setMessages((prev) => [msg, ...prev].slice(0, 50));
        appendLog({ type: "pit", text: `Message received: ${msg.text}` });
        console.log("[PIT] New message from", msg.sender, "priority:", msg.priority);
        break;
      }

      case "flag_event": {
        const flag = (raw.flag as FlagState) ?? null;
        setActiveFlag(flag);
        const sectorNote = raw.sector ? ` — Sector ${raw.sector}` : "";
        const flagText = flag
          ? `${flag.charAt(0).toUpperCase() + flag.slice(1)} flag${sectorNote}`
          : "Flag cleared";
        appendLog({ type: "flag", text: flagText });
        console.log("[PIT] Flag event:", flag);
        break;
      }

      case "voice_start": {
        const entry: VoiceEntry = {
          id: `voice-${Date.now()}`,
          timestamp: nowTimestamp(),
          direction: "RX",
          sender: raw.from ?? "PIT",
          durationMs: 0,
        };
        setVoiceLog((prev) => [entry, ...prev].slice(0, 20));
        break;
      }

      case "voice_end": {
        const durMs = typeof raw.duration_ms === "number" ? raw.duration_ms : 0;
        setVoiceLog((prev) =>
          prev.map((v, i) => i === 0 && v.durationMs === 0 ? { ...v, durationMs: durMs } : v)
        );
        appendLog({ type: "comms", text: `Voice received — ${raw.from ?? "PIT"} (${Math.round(durMs / 1000)}s)` });
        break;
      }

      case "ack_confirm":
        console.log("[PIT] ACK confirmed by hub for:", raw.message_id);
        break;

      default:
        console.log("[PIT] Unknown hub message type:", raw.type);
    }
  }, [appendLog]);

  // ── WebSocket connect ──────────────────────────────────────────────────────
  const connectHub = useCallback((url?: string) => {
    const target = url ?? hubUrl;
    if (url) setHubUrl(target);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    setHubStatus("connecting");
    console.log("[PIT] Connecting to Hub:", target);

    try {
      const ws = new WebSocket(target);
      ws.onopen = () => {
        console.log("[PIT] Hub WebSocket connected");
        setHubStatus("connected");
        wsRef.current = ws;
        ws.send(JSON.stringify({ type: "driver_ready", role: "driver" }));
      };
      ws.onmessage = (event) => {
        try {
          handleHubMessage(JSON.parse(event.data as string));
        } catch (e) {
          console.error("[PIT] Parse error:", e);
        }
      };
      ws.onerror = () => {
        console.warn("[PIT] Hub WebSocket error");
        setHubStatus("error");
      };
      ws.onclose = () => {
        console.log("[PIT] Hub WebSocket closed");
        wsRef.current = null;
        if (hubStatusRef.current !== "disconnected") {
          setHubStatus("disconnected");
          setSignalBars(0);
          setRssi(null);
          reconnectTimer.current = setTimeout(() => {
            if (hubStatusRef.current === "disconnected") {
              console.log("[PIT] Auto-reconnecting to hub...");
              connectHub(target);
            }
          }, 4000);
        }
      };
    } catch (e) {
      console.error("[PIT] WebSocket open error:", e);
      setHubStatus("error");
    }
  }, [hubUrl, handleHubMessage]);

  const disconnectHub = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setHubStatus("disconnected");
    setSignalBars(0);
    setRssi(null);
    console.log("[PIT] Hub disconnected by user");
  }, []);

  // ── Simulate mode ──────────────────────────────────────────────────────────
  const startSimulate = useCallback(() => {
    setIsSimulating(true);
    setHubStatus("connected");
    setSignalBars(3);
    setRssi(-68);
    simPhaseRef.current = 0;

    appendLog({ type: "system", text: "Hub connected — Signal: Good (simulated)" });
    console.log("[PIT] Simulation started");

    const SIM_EVENTS: Array<() => void> = [
      () => handleHubMessage({ type: "pit_message", id: `sim-${Date.now()}`, priority: "normal", category: "info", text: "Driver check-in — all systems go", sender: "Race Eng.", timestamp: nowTimestamp() }),
      () => handleHubMessage({ type: "flag_event", flag: "yellow", sector: 2 }),
      () => handleHubMessage({ type: "rssi_update", rssi: -74 }),
      () => handleHubMessage({ type: "pit_message", id: `sim-${Date.now()}`, priority: "high", category: "strategy", text: "Increase pace — gap to P2 is 3.4s", sender: "Race Eng.", timestamp: nowTimestamp() }),
      () => handleHubMessage({ type: "flag_event", flag: "green" }),
      () => handleHubMessage({ type: "voice_start", from: "Race Eng." }),
      () => handleHubMessage({ type: "voice_end", from: "Race Eng.", duration_ms: 6200 }),
      () => handleHubMessage({ type: "rssi_update", rssi: -62 }),
      () => handleHubMessage({ type: "pit_message", id: `sim-${Date.now()}`, priority: "critical", category: "instruction", text: "BOX THIS LAP — tyres at limit", sender: "Race Eng.", timestamp: nowTimestamp() }),
    ];

    simTimer.current = setInterval(() => {
      const idx = simPhaseRef.current % SIM_EVENTS.length;
      SIM_EVENTS[idx]();
      simPhaseRef.current += 1;
    }, 8000);
  }, [handleHubMessage, appendLog]);

  const stopSimulate = useCallback(() => {
    setIsSimulating(false);
    setHubStatus("disconnected");
    setSignalBars(0);
    setRssi(null);
    if (simTimer.current) {
      clearInterval(simTimer.current);
      simTimer.current = null;
    }
    console.log("[PIT] Simulation stopped");
  }, []);

  // ── Outgoing ───────────────────────────────────────────────────────────────
  const ackMessage = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === messageId ? { ...m, status: "acknowledged" as MsgStatus } : m)
    );
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ack_message", message_id: messageId }));
    }
    console.log("[PIT] ACK sent for:", messageId);
  }, []);

  const markRead = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => m.id === messageId && m.status === "unread" ? { ...m, status: "read" as MsgStatus } : m)
    );
  }, []);

  const logVoiceTX = useCallback((durationMs: number) => {
    const entry: VoiceEntry = {
      id: `voice-tx-${Date.now()}`,
      timestamp: nowTimestamp(),
      direction: "TX",
      sender: "Driver",
      durationMs,
    };
    setVoiceLog((prev) => [entry, ...prev].slice(0, 20));
    appendLog({ type: "comms", text: `Voice sent — ${Math.round(durationMs / 1000)}s` });
  }, [appendLog]);

  useEffect(() => {
    return () => {
      disconnectHub();
      if (simTimer.current) clearInterval(simTimer.current);
    };
  }, [disconnectHub]);

  const unreadCount = useMemo(() => messages.filter((m) => m.status === "unread").length, [messages]);
  const isConnected = hubStatus === "connected";

  return useMemo(() => ({
    hubStatus,
    hubUrl,
    isConnected,
    rssi,
    signalBars,
    activeFlag,
    messages,
    log,
    voiceLog,
    unreadCount,
    isSimulating,
    connectHub,
    disconnectHub,
    startSimulate,
    stopSimulate,
    ackMessage,
    markRead,
    logVoiceTX,
  }), [
    hubStatus, hubUrl, isConnected, rssi, signalBars, activeFlag,
    messages, log, voiceLog, unreadCount, isSimulating,
    connectHub, disconnectHub, startSimulate, stopSimulate,
    ackMessage, markRead, logVoiceTX,
  ]);
});
