# Reycin Hub Node Firmware Specification

**Version:** 1.0.0  
**Device Role:** Central race control aggregator, lap timing engine, PIT Manager server  
**Target Hardware:** ESP32-WROOM-32 (ESP32-S3 recommended for memory headroom)  
**Communication:** ESP-NOW (from Marshal/Vehicle nodes inbound) + WiFi AP + WebSocket (to PIT Manager app)

---

## Overview

The Hub Node is the single central authority of the Reycin Race Network. It sits in the pit lane or race control area and serves as the convergence point for all vehicle telemetry and crossing events arriving from the marshal network.

### Primary Responsibilities

1. **Receive** all upstream frames from Marshal Nodes (and direct Vehicle Node broadcasts if in range)
2. **Compute** authoritative lap times using crossing events from the Start/Finish marshal node
3. **Track** all active vehicles simultaneously — position, speed, telemetry, sector times
4. **Serve** real-time race data to the PIT Manager application over a local WiFi WebSocket server
5. **Accept** race control commands from the PIT Manager app and relay them back into the mesh as needed
6. **Log** session data in-memory for the duration of a race session

### What the Hub Does NOT Do

- It does not connect to the internet during a race session (operates fully local)
- It does not communicate directly with vehicles (read-only from vehicle telemetry)
- It does not store data permanently — session logs are exported to the PIT app on demand
- It does not replace the mobile app's OBD connection — it is a parallel, independent data path

---

## Network Topology

```
                    ┌──────────────────────────────────────────────┐
                    │              RACE TRACK MESH                 │
                    │                                              │
   [Vehicle A] ──ESP-NOW──▶ [Marshal T1] ──ESP-NOW──▶             │
   [Vehicle B] ──ESP-NOW──▶ [Marshal T3] ──ESP-NOW──▶             │
   [Vehicle C] ──ESP-NOW──▶ [Marshal SF] ──ESP-NOW──▶ [HUB NODE] ◀┘
                                │ (IR crossing)          │
                                └────────────────────────┘
                                                         │
                                                   WiFi AP
                                                   ws://192.168.5.1:82
                                                         │
                                              [PIT Manager App]
                                              (iPad / Tablet / Phone)
```

---

## Hardware Requirements

### Required
- ESP32-WROOM-32 or ESP32-S3-DevKitC
- Power supply (USB power bank, 12V → 5V, or direct USB)
- Stable mounting in pit lane / race control

### Recommended
- External WiFi antenna for maximum PIT app range
- 7" tablet running PIT Manager app connected to Hub AP
- Weatherproof enclosure if deployed trackside

---

## Wiring Diagram

```
ESP32 Pin   | Component           | Description
------------|--------------------|---------------------------------
GPIO 2      | LED — Status        | Blink = receiving; Solid = PIT connected
GPIO 4      | LED — Lap Trigger   | Flashes on each lap recorded
GPIO 5      | LED — PIT TX        | Flashes when sending to PIT app
3.3V / GND  | Power               | Logic power and ground
```

No serial peripherals required on the Hub. All I/O is through WiFi (PIT app) and ESP-NOW (mesh).

---

## Complete Arduino Firmware (.ino)

```cpp
/*
 * Reycin USA — Hub Node Firmware
 * Version: 1.0.0
 * Role: Race network aggregator, lap timing engine, PIT Manager WebSocket server
 *
 * The Hub is the single source of truth for:
 *   - All vehicle positions and telemetry
 *   - Official lap times
 *   - Race session state
 *
 * It serves a WebSocket server on port 82 that the PIT Manager app connects to.
 * WiFi SSID: Reycin_HUB_XXXXXX
 * WiFi Password: reycinpit
 * WebSocket: ws://192.168.5.1:82
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <EEPROM.h>

// ─── Identity ─────────────────────────────────────────────────────────────────
#define FIRMWARE_VERSION    "1.0.0"
#define NODE_TYPE           "hub"
#define DEVICE_NAME         "Reycin_HUB_"
#define AP_PASSWORD         "reycinpit"
#define WEBSOCKET_PORT      82

// ─── Pin Config ───────────────────────────────────────────────────────────────
#define LED_STATUS          2
#define LED_LAP             4
#define LED_PIT_TX          5

// ─── Timing & Limits ─────────────────────────────────────────────────────────
#define MAX_VEHICLES        16
#define MAX_LAPS_PER_CAR    200
#define VEHICLE_TIMEOUT_MS  30000   // Mark vehicle inactive after 30s no telemetry
#define CROSSING_WINDOW_MS  10000   // Min ms between lap crossings for same vehicle (prevents double-count)
#define EEPROM_SIZE         512

// ─── Race Session State ───────────────────────────────────────────────────────
typedef enum {
  SESSION_IDLE,       // No active session
  SESSION_WARMUP,     // Cars on track, timing not started
  SESSION_ACTIVE,     // Race/qualifying in progress — lap times being recorded
  SESSION_PAUSED,     // Yellow flag / pause
  SESSION_FINISHED    // Checkered — session complete
} SessionState;

SessionState sessionState = SESSION_IDLE;
unsigned long sessionStartMs = 0;
char  sessionId[16] = "";
char  sessionName[32] = "Race Session";
int   sessionLapTarget = 0; // 0 = unlimited

// ─── Flag State ───────────────────────────────────────────────────────────────
typedef enum {
  FLAG_GREEN,
  FLAG_YELLOW,
  FLAG_RED,
  FLAG_CHECKERED,
  FLAG_SAFETY_CAR,
  FLAG_NONE
} FlagState;

FlagState currentFlag = FLAG_NONE;

// ─── Vehicle Tracking ────────────────────────────────────────────────────────
struct LapRecord {
  uint32_t lapNumber;
  uint32_t lapTimeMs;    // Duration of this lap in milliseconds
  uint32_t crossingMs;   // Hub millis() when crossing was received
  char     triggerNode[8]; // Which marshal node triggered this crossing
};

struct VehicleState {
  char     id[8];
  bool     active;
  bool     onTrack;

  // Last known position
  float    lat;
  float    lon;
  float    speed_kmh;
  float    heading;
  uint32_t lastSeenMs;

  // Last known OBD
  uint8_t  obdState;    // 0=absent, 1=no_data, 2=active
  int      rpm;
  int      ect_c;
  int      throttle_pct;
  float    vbat;
  bool     sessionActive;

  // Lap timing
  uint32_t lapCount;
  uint32_t lastCrossingMs;
  LapRecord laps[MAX_LAPS_PER_CAR];

  // Sector tracking (crossing nodes define sector boundaries)
  uint32_t sectorStartMs;
  char     currentSector[8];

  // Best / last lap
  uint32_t bestLapMs;
  uint32_t lastLapMs;
};

VehicleState vehicles[MAX_VEHICLES] = {};

// ─── Marshal Node Registry ────────────────────────────────────────────────────
// Tracks which marshal nodes are alive and their last heartbeat
// Marshal nodes do not send heartbeats in v1 — this is populated as frames arrive
#define MAX_MARSHALS        16

struct MarshalRecord {
  char     id[8];
  bool     active;
  uint32_t lastSeenMs;
  float    lat;
  float    lon;
  int      rssi;
};

MarshalRecord marshals[MAX_MARSHALS] = {};

// ─── WebSocket Server (PIT App) ───────────────────────────────────────────────
WebSocketsServer pitServer = WebSocketsServer(WEBSOCKET_PORT);
bool pitConnected = false;
uint8_t pitClientNum = 0;
unsigned long lastFullBroadcastMs = 0;
#define FULL_BROADCAST_INTERVAL_MS 1000 // Send full state to PIT app every 1s

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);

  pinMode(LED_STATUS,  OUTPUT);
  pinMode(LED_LAP,     OUTPUT);
  pinMode(LED_PIT_TX,  OUTPUT);
  digitalWrite(LED_STATUS, LOW);
  digitalWrite(LED_LAP,    LOW);
  digitalWrite(LED_PIT_TX, LOW);

  generateSessionId();
  setupWiFiAP();
  setupESPNow();

  pitServer.begin();
  pitServer.onEvent(onPITWebSocketEvent);

  Serial.printf("[HUB] Reycin Hub Node v%s ready\n", FIRMWARE_VERSION);
  Serial.printf("[HUB] PIT App: ws://%s:%d\n", WiFi.softAPIP().toString().c_str(), WEBSOCKET_PORT);
  Serial.printf("[HUB] WiFi SSID: %s%s\n", DEVICE_NAME, getDeviceID().c_str());
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  pitServer.loop();

  unsigned long now = millis();

  // Periodic full state broadcast to PIT app
  if (now - lastFullBroadcastMs >= FULL_BROADCAST_INTERVAL_MS) {
    if (pitConnected) broadcastFullState();
    lastFullBroadcastMs = now;
  }

  // Expire stale vehicles
  expireStaleVehicles(now);

  updateStatusLED();

  if (Serial.available()) handleSerialCommand();
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIFI + ESP-NOW SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setupWiFiAP() {
  String ssid = String(DEVICE_NAME) + getDeviceID();
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid.c_str(), AP_PASSWORD, 6); // Channel 6 — avoids conflict with vehicle nodes on ch 1
  Serial.printf("[HUB] AP: %s  IP: %s\n", ssid.c_str(), WiFi.softAPIP().toString().c_str());
}

void setupESPNow() {
  if (esp_now_init() != ESP_OK) {
    Serial.println("[MESH] ESP-NOW init failed");
    return;
  }
  esp_now_register_recv_cb(onMeshFrameReceived);
  Serial.println("[MESH] ESP-NOW listening");
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESP-NOW RECEIVE — All inbound mesh frames
// ─────────────────────────────────────────────────────────────────────────────
void onMeshFrameReceived(const uint8_t* senderMAC, const uint8_t* data, int len) {
  flashLED(LED_STATUS);

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, data, len) != DeserializationError::Ok) {
    Serial.println("[MESH] Malformed frame — dropped");
    return;
  }

  String frameType = doc["t"] | "";

  if (frameType == "veh" || frameType == "marshal_relay") {
    processTelemetryFrame(doc);
  } else if (frameType == "crossing") {
    processCrossingEvent(doc);
  } else {
    Serial.printf("[MESH] Unknown frame type: %s\n", frameType.c_str());
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  TELEMETRY FRAME PROCESSING
// ─────────────────────────────────────────────────────────────────────────────
void processTelemetryFrame(const StaticJsonDocument<512>& doc) {
  const char* vehicleId = doc["id"] | "";
  if (strlen(vehicleId) == 0) return;

  VehicleState* v = getOrCreateVehicle(vehicleId);
  if (!v) return;

  v->active     = true;
  v->onTrack    = true;
  v->lastSeenMs = millis();
  v->sessionActive = doc["sess"] | false;

  // GPS data
  if (doc.containsKey("lat")) {
    v->lat        = doc["lat"] | 0.0f;
    v->lon        = doc["lon"] | 0.0f;
    v->speed_kmh  = doc["spd"] | 0.0f;
    v->heading    = doc["hdg"] | 0.0f;
  }

  // OBD data (compact mesh format)
  v->obdState     = doc["obd"]  | 0;
  if (doc.containsKey("rpm"))  v->rpm          = doc["rpm"];
  if (doc.containsKey("ect"))  v->ect_c        = doc["ect"];
  if (doc.containsKey("tps"))  v->throttle_pct = doc["tps"];
  if (doc.containsKey("vbat")) v->vbat         = doc["vbat"];

  // Track the relaying marshal node
  const char* via = doc["via"] | "";
  if (strlen(via) > 0) updateMarshalRecord(via, doc);

  // Forward to PIT app immediately (live telemetry push)
  if (pitConnected) pushTelemetryToPIT(v, doc);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CROSSING EVENT PROCESSING — Lap Timing Engine
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Crossing events arrive from any Marshal Node.
 * Only crossings from the designated Start/Finish node (configured below)
 * are used to record official lap times.
 * Crossings from other nodes are recorded as sector markers.
 *
 * The lap timing algorithm:
 *   1. First crossing for a vehicle → records lap start (no lap time yet)
 *   2. Each subsequent crossing → records a lap time (current - previous crossing)
 *   3. If session is IDLE/FINISHED, crossing events are still recorded but flagged as unofficial
 */
#define START_FINISH_NODE   "M-SF"  // Node ID of the start/finish marshal node

void processCrossingEvent(const StaticJsonDocument<512>& doc) {
  const char* nodeId = doc["node"] | "";
  uint32_t    crossingMs = doc["ms"] | millis();

  Serial.printf("[LAP] Crossing at node %s at %lu ms\n", nodeId, crossingMs);

  // Update marshal record
  updateMarshalRecordByName(nodeId);

  // Flash lap LED
  flashLED(LED_LAP);

  // For start/finish crossings, try to correlate to a vehicle
  // In a single-vehicle session, assign to the only active vehicle
  // In multi-vehicle sessions, correlate by timing proximity to vehicle telemetry
  if (strcmp(nodeId, START_FINISH_NODE) == 0) {
    VehicleState* v = resolveVehicleForCrossing(crossingMs);
    if (v) {
      recordLapCrossing(v, nodeId, crossingMs);
    } else {
      // No vehicle matched — log unmatched crossing for PIT app review
      pushUnmatchedCrossingToPIT(nodeId, crossingMs);
    }
  } else {
    // Sector crossing — find vehicle and record sector split
    VehicleState* v = resolveVehicleForCrossing(crossingMs);
    if (v) recordSectorCrossing(v, nodeId, crossingMs);
  }

  // Always push crossing event to PIT app
  if (pitConnected) {
    StaticJsonDocument<256> evt;
    evt["type"]      = "crossing";
    evt["node"]      = nodeId;
    evt["ms"]        = crossingMs;
    evt["source"]    = doc["source"] | "unknown";
    String json;
    serializeJson(evt, json);
    pitServer.sendTXT(pitClientNum, json);
  }
}

void recordLapCrossing(VehicleState* v, const char* nodeId, uint32_t crossingMs) {
  // Debounce — ignore if last crossing was too recent
  if (v->lastCrossingMs > 0 &&
      (crossingMs - v->lastCrossingMs) < CROSSING_WINDOW_MS) {
    Serial.printf("[LAP] Debounced crossing for %s (too soon)\n", v->id);
    return;
  }

  if (v->lastCrossingMs == 0) {
    // First crossing — start timing
    v->lastCrossingMs = crossingMs;
    v->sectorStartMs  = crossingMs;
    Serial.printf("[LAP] Timing started for vehicle %s\n", v->id);

    if (pitConnected) {
      StaticJsonDocument<128> msg;
      msg["type"]      = "lap_start";
      msg["vehicle"]   = v->id;
      msg["ms"]        = crossingMs;
      String json;
      serializeJson(msg, json);
      pitServer.sendTXT(pitClientNum, json);
    }
    return;
  }

  // Compute lap time
  uint32_t lapTimeMs = crossingMs - v->lastCrossingMs;
  v->lastCrossingMs  = crossingMs;
  v->lastLapMs       = lapTimeMs;
  if (v->bestLapMs == 0 || lapTimeMs < v->bestLapMs) {
    v->bestLapMs = lapTimeMs;
  }

  // Store lap record
  if (v->lapCount < MAX_LAPS_PER_CAR) {
    LapRecord& lap      = v->laps[v->lapCount];
    lap.lapNumber       = v->lapCount + 1;
    lap.lapTimeMs       = lapTimeMs;
    lap.crossingMs      = crossingMs;
    strncpy(lap.triggerNode, nodeId, 7);
  }
  v->lapCount++;

  Serial.printf("[LAP] Vehicle %s — Lap %lu: %lu ms (%s)\n",
    v->id, v->lapCount, lapTimeMs, formatLapTime(lapTimeMs).c_str());

  // Push lap completed event to PIT app
  if (pitConnected) {
    StaticJsonDocument<256> msg;
    msg["type"]       = "lap_completed";
    msg["vehicle"]    = v->id;
    msg["lap"]        = v->lapCount;
    msg["lap_ms"]     = lapTimeMs;
    msg["lap_time"]   = formatLapTime(lapTimeMs);
    msg["best_ms"]    = v->bestLapMs;
    msg["best_time"]  = formatLapTime(v->bestLapMs);
    msg["crossing_ms"] = crossingMs;
    String json;
    serializeJson(msg, json);
    pitServer.sendTXT(pitClientNum, json);
    flashLED(LED_LAP);
  }

  // Check lap target
  if (sessionLapTarget > 0 && (int)v->lapCount >= sessionLapTarget) {
    Serial.printf("[SESSION] Lap target reached for %s\n", v->id);
    // In multi-vehicle session, do not auto-end — let PIT operator decide
  }
}

void recordSectorCrossing(VehicleState* v, const char* nodeId, uint32_t crossingMs) {
  uint32_t sectorTimeMs = crossingMs - v->sectorStartMs;
  v->sectorStartMs = crossingMs;
  strncpy(v->currentSector, nodeId, 7);

  Serial.printf("[SECTOR] Vehicle %s at %s: %lu ms\n", v->id, nodeId, sectorTimeMs);

  if (pitConnected) {
    StaticJsonDocument<256> msg;
    msg["type"]        = "sector";
    msg["vehicle"]     = v->id;
    msg["node"]        = nodeId;
    msg["sector_ms"]   = sectorTimeMs;
    msg["sector_time"] = formatLapTime(sectorTimeMs);
    String json;
    serializeJson(msg, json);
    pitServer.sendTXT(pitClientNum, json);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  VEHICLE RESOLUTION — Match crossing to vehicle
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Associates a crossing event with a specific vehicle.
 *
 * Algorithm (v1 — single vehicle assumed unless GPS proximity implemented):
 *   1. If exactly one active vehicle: assign to that vehicle
 *   2. If multiple active vehicles: find the one whose last telemetry GPS
 *      position is closest to the crossing node's registered position
 *   3. If no active vehicles: return null (unmatched crossing)
 *
 * Multi-vehicle GPS proximity matching requires marshal node GPS data
 * (populated if GPS_ENABLED on that node). This is the preferred approach
 * once marshal nodes are GPS-equipped.
 */
VehicleState* resolveVehicleForCrossing(uint32_t crossingMs) {
  int activeCount = 0;
  VehicleState* lastActive = nullptr;

  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (vehicles[i].active && vehicles[i].onTrack) {
      activeCount++;
      lastActive = &vehicles[i];
    }
  }

  if (activeCount == 0) return nullptr;
  if (activeCount == 1) return lastActive;

  // Multi-vehicle: find vehicle whose GPS speed suggests they just crossed
  // Heuristic: prefer the vehicle with the most recent telemetry near crossing time
  VehicleState* best = nullptr;
  uint32_t minDelta = UINT32_MAX;

  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (!vehicles[i].active || !vehicles[i].onTrack) continue;
    uint32_t delta = (crossingMs > vehicles[i].lastSeenMs)
                   ? (crossingMs - vehicles[i].lastSeenMs)
                   : (vehicles[i].lastSeenMs - crossingMs);
    if (delta < minDelta) {
      minDelta = delta;
      best     = &vehicles[i];
    }
  }

  return best;
}

// ─────────────────────────────────────────────────────────────────────────────
//  PIT MANAGER WEBSOCKET SERVER
// ─────────────────────────────────────────────────────────────────────────────
void onPITWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[PIT] Client %u disconnected\n", num);
      pitConnected = false;
      break;

    case WStype_CONNECTED: {
      Serial.printf("[PIT] Client %u connected\n", num);
      pitConnected  = true;
      pitClientNum  = num;

      // Send full handshake
      StaticJsonDocument<256> doc;
      doc["type"]      = "hub_connected";
      doc["version"]   = FIRMWARE_VERSION;
      doc["device_id"] = getDeviceID();
      doc["session"]   = sessionId;
      doc["state"]     = sessionStateStr();
      doc["flag"]      = flagStr();
      String json;
      serializeJson(doc, json);
      pitServer.sendTXT(num, json);

      // Immediately send full state
      broadcastFullState();
      break;
    }

    case WStype_TEXT: {
      StaticJsonDocument<256> doc;
      if (deserializeJson(doc, payload, length) == DeserializationError::Ok) {
        handlePITCommand(num, doc);
      }
      break;
    }
  }
}

void handlePITCommand(uint8_t num, const StaticJsonDocument<256>& doc) {
  String cmd = doc["command"] | "";
  Serial.printf("[PIT] Command: %s\n", cmd.c_str());

  if (cmd == "start_session") {
    sessionState   = SESSION_ACTIVE;
    sessionStartMs = millis();
    const char* name = doc["name"] | "Race Session";
    strncpy(sessionName, name, 31);
    int target = doc["laps"] | 0;
    sessionLapTarget = target;
    clearAllLaps();
    replyPIT(num, "session_started", true);

  } else if (cmd == "stop_session") {
    sessionState = SESSION_FINISHED;
    replyPIT(num, "session_stopped", true);

  } else if (cmd == "pause_session") {
    sessionState = SESSION_PAUSED;
    replyPIT(num, "session_paused", true);

  } else if (cmd == "resume_session") {
    sessionState = SESSION_ACTIVE;
    replyPIT(num, "session_resumed", true);

  } else if (cmd == "set_flag") {
    String flag = doc["flag"] | "none";
    setFlag(flag);
    pushFlagToPIT(num);

  } else if (cmd == "get_full_state") {
    broadcastFullState();

  } else if (cmd == "get_laps") {
    const char* vid = doc["vehicle"] | "";
    sendLapHistoryToPIT(num, vid);

  } else if (cmd == "reset_vehicle_laps") {
    const char* vid = doc["vehicle"] | "";
    resetVehicleLaps(vid);
    replyPIT(num, "laps_reset", true);

  } else if (cmd == "manual_lap") {
    // Force a lap crossing from PIT app (manual override)
    const char* vid = doc["vehicle"] | "";
    VehicleState* v = findVehicle(vid);
    if (v) recordLapCrossing(v, "MANUAL", millis());
    replyPIT(num, "manual_lap_recorded", v != nullptr);

  } else if (cmd == "ping") {
    replyPIT(num, "pong", true);
  }
}

void replyPIT(uint8_t num, const char* event, bool success) {
  StaticJsonDocument<128> doc;
  doc["type"]    = event;
  doc["success"] = success;
  doc["uptime"]  = millis();
  String json;
  serializeJson(doc, json);
  pitServer.sendTXT(num, json);
  flashLED(LED_PIT_TX);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PIT APP DATA PUSH
// ─────────────────────────────────────────────────────────────────────────────

// Push live telemetry for a specific vehicle immediately (triggered by frame receipt)
void pushTelemetryToPIT(VehicleState* v, const StaticJsonDocument<512>& src) {
  StaticJsonDocument<512> doc;
  doc["type"]       = "telemetry";
  doc["vehicle"]    = v->id;
  doc["speed_kmh"]  = v->speed_kmh;
  doc["heading"]    = v->heading;
  doc["lat"]        = v->lat;
  doc["lon"]        = v->lon;
  doc["lap"]        = v->lapCount;
  doc["last_lap"]   = formatLapTime(v->lastLapMs);
  doc["best_lap"]   = formatLapTime(v->bestLapMs);
  doc["obd_state"]  = v->obdState;

  if (v->obdState == 2) {
    doc["rpm"]  = v->rpm;
    doc["ect"]  = v->ect_c;
    doc["tps"]  = v->throttle_pct;
    doc["vbat"] = v->vbat;
  }

  // Include relay path for PIT diagnostics
  if (src.containsKey("via"))  doc["via"]  = src["via"];
  if (src.containsKey("hops")) doc["hops"] = src["hops"];

  String json;
  serializeJson(doc, json);
  pitServer.sendTXT(pitClientNum, json);
  flashLED(LED_PIT_TX);
}

// Send full race state (all vehicles + session + flags) every 1s
void broadcastFullState() {
  StaticJsonDocument<1024> doc;
  doc["type"]      = "full_state";
  doc["session"]   = sessionId;
  doc["state"]     = sessionStateStr();
  doc["flag"]      = flagStr();
  doc["elapsed_ms"] = (sessionState == SESSION_ACTIVE) ? (millis() - sessionStartMs) : 0;

  JsonArray arr = doc.createNestedArray("vehicles");
  for (int i = 0; i < MAX_VEHICLES; i++) {
    VehicleState& v = vehicles[i];
    if (!v.active) continue;

    JsonObject vo   = arr.createNestedObject();
    vo["id"]        = v.id;
    vo["on_track"]  = v.onTrack;
    vo["lap"]       = v.lapCount;
    vo["last_lap"]  = formatLapTime(v.lastLapMs);
    vo["best_lap"]  = formatLapTime(v.bestLapMs);
    vo["speed_kmh"] = v.speed_kmh;
    vo["lat"]       = v.lat;
    vo["lon"]       = v.lon;
    vo["obd_state"] = v.obdState;
    vo["last_seen_ms"] = millis() - v.lastSeenMs;
  }

  // Marshal nodes status
  JsonArray mArr = doc.createNestedArray("marshals");
  for (int i = 0; i < MAX_MARSHALS; i++) {
    if (!marshals[i].active) continue;
    JsonObject mo = mArr.createNestedObject();
    mo["id"]      = marshals[i].id;
    mo["rssi"]    = marshals[i].rssi;
    mo["age_ms"]  = millis() - marshals[i].lastSeenMs;
  }

  String json;
  serializeJson(doc, json);
  pitServer.sendTXT(pitClientNum, json);
}

void sendLapHistoryToPIT(uint8_t num, const char* vehicleId) {
  VehicleState* v = findVehicle(vehicleId);

  StaticJsonDocument<2048> doc;
  doc["type"]    = "lap_history";
  doc["vehicle"] = vehicleId;

  JsonArray laps = doc.createNestedArray("laps");

  if (v) {
    for (uint32_t i = 0; i < v->lapCount && i < MAX_LAPS_PER_CAR; i++) {
      JsonObject l = laps.createNestedObject();
      l["lap"]     = v->laps[i].lapNumber;
      l["ms"]      = v->laps[i].lapTimeMs;
      l["time"]    = formatLapTime(v->laps[i].lapTimeMs);
      l["node"]    = v->laps[i].triggerNode;
    }
    doc["best_ms"]   = v->bestLapMs;
    doc["best_time"] = formatLapTime(v->bestLapMs);
  }

  String json;
  serializeJson(doc, json);
  pitServer.sendTXT(num, json);
}

void pushUnmatchedCrossingToPIT(const char* nodeId, uint32_t crossingMs) {
  if (!pitConnected) return;
  StaticJsonDocument<128> doc;
  doc["type"]   = "unmatched_crossing";
  doc["node"]   = nodeId;
  doc["ms"]     = crossingMs;
  String json;
  serializeJson(doc, json);
  pitServer.sendTXT(pitClientNum, json);
}

void pushFlagToPIT(uint8_t num) {
  StaticJsonDocument<128> doc;
  doc["type"] = "flag";
  doc["flag"] = flagStr();
  String json;
  serializeJson(doc, json);
  pitServer.sendTXT(num, json);
}

// ─────────────────────────────────────────────────────────────────────────────
//  VEHICLE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
VehicleState* getOrCreateVehicle(const char* id) {
  // Find existing
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (vehicles[i].active && strcmp(vehicles[i].id, id) == 0) {
      return &vehicles[i];
    }
  }
  // Create new
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (!vehicles[i].active) {
      memset(&vehicles[i], 0, sizeof(VehicleState));
      strncpy(vehicles[i].id, id, 7);
      vehicles[i].active = true;
      Serial.printf("[HUB] New vehicle: %s\n", id);
      return &vehicles[i];
    }
  }
  return nullptr;
}

VehicleState* findVehicle(const char* id) {
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (vehicles[i].active && strcmp(vehicles[i].id, id) == 0) return &vehicles[i];
  }
  return nullptr;
}

void expireStaleVehicles(unsigned long now) {
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (vehicles[i].active && vehicles[i].onTrack) {
      if ((now - vehicles[i].lastSeenMs) > VEHICLE_TIMEOUT_MS) {
        vehicles[i].onTrack = false;
        Serial.printf("[HUB] Vehicle %s timed out — marked off track\n", vehicles[i].id);
      }
    }
  }
}

void clearAllLaps() {
  for (int i = 0; i < MAX_VEHICLES; i++) {
    vehicles[i].lapCount       = 0;
    vehicles[i].lastCrossingMs = 0;
    vehicles[i].lastLapMs      = 0;
    vehicles[i].bestLapMs      = 0;
    vehicles[i].sectorStartMs  = 0;
    memset(vehicles[i].laps, 0, sizeof(vehicles[i].laps));
  }
}

void resetVehicleLaps(const char* id) {
  VehicleState* v = findVehicle(id);
  if (!v) return;
  v->lapCount       = 0;
  v->lastCrossingMs = 0;
  v->lastLapMs      = 0;
  v->bestLapMs      = 0;
  v->sectorStartMs  = 0;
  memset(v->laps, 0, sizeof(v->laps));
}

// ─────────────────────────────────────────────────────────────────────────────
//  MARSHAL TRACKING
// ─────────────────────────────────────────────────────────────────────────────
void updateMarshalRecord(const char* id, const StaticJsonDocument<512>& doc) {
  for (int i = 0; i < MAX_MARSHALS; i++) {
    if (marshals[i].active && strcmp(marshals[i].id, id) == 0) {
      marshals[i].lastSeenMs = millis();
      marshals[i].rssi       = doc["via_rssi"] | -99;
      if (doc.containsKey("node_lat")) marshals[i].lat = doc["node_lat"];
      if (doc.containsKey("node_lon")) marshals[i].lon = doc["node_lon"];
      return;
    }
  }
  for (int i = 0; i < MAX_MARSHALS; i++) {
    if (!marshals[i].active) {
      strncpy(marshals[i].id, id, 7);
      marshals[i].active     = true;
      marshals[i].lastSeenMs = millis();
      marshals[i].rssi       = doc["via_rssi"] | -99;
      Serial.printf("[HUB] New marshal node: %s\n", id);
      return;
    }
  }
}

void updateMarshalRecordByName(const char* id) {
  StaticJsonDocument<2> dummy;
  updateMarshalRecord(id, dummy);
}

// ─────────────────────────────────────────────────────────────────────────────
//  FLAG STATE
// ─────────────────────────────────────────────────────────────────────────────
void setFlag(const String& flag) {
  if      (flag == "green")      currentFlag = FLAG_GREEN;
  else if (flag == "yellow")     currentFlag = FLAG_YELLOW;
  else if (flag == "red")        currentFlag = FLAG_RED;
  else if (flag == "checkered")  currentFlag = FLAG_CHECKERED;
  else if (flag == "safety_car") currentFlag = FLAG_SAFETY_CAR;
  else                           currentFlag = FLAG_NONE;
  Serial.printf("[FLAG] %s\n", flagStr());
}

const char* flagStr() {
  switch (currentFlag) {
    case FLAG_GREEN:      return "green";
    case FLAG_YELLOW:     return "yellow";
    case FLAG_RED:        return "red";
    case FLAG_CHECKERED:  return "checkered";
    case FLAG_SAFETY_CAR: return "safety_car";
    default:              return "none";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
String getDeviceID() {
  char id[7];
  sprintf(id, "%06X", (uint32_t)ESP.getEfuseMac());
  return String(id);
}

void generateSessionId() {
  sprintf(sessionId, "S%08X", (uint32_t)millis());
}

const char* sessionStateStr() {
  switch (sessionState) {
    case SESSION_IDLE:     return "idle";
    case SESSION_WARMUP:   return "warmup";
    case SESSION_ACTIVE:   return "active";
    case SESSION_PAUSED:   return "paused";
    case SESSION_FINISHED: return "finished";
  }
  return "idle";
}

String formatLapTime(uint32_t ms) {
  if (ms == 0) return "--:--.---";
  uint32_t mins    = ms / 60000;
  uint32_t secs    = (ms % 60000) / 1000;
  uint32_t millis_ = ms % 1000;
  char buf[12];
  sprintf(buf, "%02lu:%02lu.%03lu", (unsigned long)mins, (unsigned long)secs, (unsigned long)millis_);
  return String(buf);
}

void flashLED(int pin) {
  digitalWrite(pin, HIGH);
  delay(20);
  digitalWrite(pin, LOW);
}

void updateStatusLED() {
  static unsigned long last = 0;
  static bool          on   = false;
  if (pitConnected) {
    digitalWrite(LED_STATUS, HIGH);
  } else {
    if (millis() - last > 800) { on = !on; digitalWrite(LED_STATUS, on); last = millis(); }
  }
}

void handleSerialCommand() {
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "status") {
    Serial.printf("[HUB] Session: %s  State: %s  Flag: %s\n", sessionId, sessionStateStr(), flagStr());
    Serial.printf("[HUB] PIT Connected: %s\n", pitConnected ? "YES" : "NO");
    int vc = 0;
    for (int i = 0; i < MAX_VEHICLES; i++) if (vehicles[i].active) vc++;
    Serial.printf("[HUB] Active vehicles: %d\n", vc);

  } else if (cmd == "laps") {
    for (int i = 0; i < MAX_VEHICLES; i++) {
      if (!vehicles[i].active) continue;
      Serial.printf("  [%s] Laps: %lu  Best: %s  Last: %s\n",
        vehicles[i].id, vehicles[i].lapCount,
        formatLapTime(vehicles[i].bestLapMs).c_str(),
        formatLapTime(vehicles[i].lastLapMs).c_str());
    }

  } else if (cmd == "reset") {
    ESP.restart();

  } else if (cmd.startsWith("flag ")) {
    setFlag(cmd.substring(5));
  }
}
```

---

## PIT Manager WebSocket API

The Hub serves the PIT Manager app at `ws://192.168.5.1:82`.  
WiFi SSID: `Reycin_HUB_XXXXXX` / Password: `reycinpit`

### Hub → PIT App (Push Events)

| Message `type` | Trigger | Description |
|---|---|---|
| `hub_connected` | PIT app connection | Initial handshake with session state |
| `full_state` | Every 1 second | All vehicles, all marshal nodes, session state |
| `telemetry` | Per vehicle frame received | Live position + speed + OBD for one vehicle |
| `lap_completed` | Every lap crossing | Lap number, time, best lap |
| `lap_start` | First crossing for vehicle | Timing has started |
| `sector` | Non-SF marshal crossing | Sector split time |
| `crossing` | Any marshal crossing | Raw crossing event |
| `unmatched_crossing` | Crossing with no vehicle | Review required |
| `flag` | Flag state change | Current flag color |

### PIT App → Hub (Commands)

| Command | Payload | Description |
|---|---|---|
| `start_session` | `{ "name": "Race 1", "laps": 10 }` | Begin timed session |
| `stop_session` | — | End session |
| `pause_session` | — | Pause timing (yellow flag) |
| `resume_session` | — | Resume timing |
| `set_flag` | `{ "flag": "yellow" }` | Set flag state (green/yellow/red/checkered/safety_car) |
| `get_full_state` | — | Request immediate full state push |
| `get_laps` | `{ "vehicle": "A3F921" }` | Request full lap history for vehicle |
| `reset_vehicle_laps` | `{ "vehicle": "A3F921" }` | Reset lap count for vehicle |
| `manual_lap` | `{ "vehicle": "A3F921" }` | Force a lap recording (manual override) |
| `ping` | — | Connectivity check |

---

## Full State Frame Example

```json
{
  "type": "full_state",
  "session": "S0A1B2C3",
  "state": "active",
  "flag": "green",
  "elapsed_ms": 342000,
  "vehicles": [
    {
      "id": "A3F921",
      "on_track": true,
      "lap": 4,
      "last_lap": "01:23.456",
      "best_lap": "01:21.102",
      "speed_kmh": 112,
      "lat": 36.1597,
      "lon": -96.5916,
      "obd_state": 2,
      "last_seen_ms": 180
    }
  ],
  "marshals": [
    { "id": "M-SF",  "rssi": -55, "age_ms": 200 },
    { "id": "M-T3",  "rssi": -70, "age_ms": 350 }
  ]
}
```

---

## Lap Completed Event Example

```json
{
  "type": "lap_completed",
  "vehicle": "A3F921",
  "lap": 4,
  "lap_ms": 83456,
  "lap_time": "01:23.456",
  "best_ms": 81102,
  "best_time": "01:21.102",
  "crossing_ms": 123456789
}
```

---

## Session State Machine

```
IDLE ──start_session──▶ ACTIVE ──pause_session──▶ PAUSED ──resume_session──▶ ACTIVE
                          │                                                       │
                          └──stop_session──▶ FINISHED ──start_session──▶ ACTIVE──┘
```

---

## LED Status

| LED | Pattern | Meaning |
|---|---|---|
| LED_STATUS (GPIO 2) | Solid ON | PIT app connected |
| LED_STATUS (GPIO 2) | Slow blink 800ms | Waiting for PIT app |
| LED_LAP (GPIO 4) | Brief flash | Lap or crossing recorded |
| LED_PIT_TX (GPIO 5) | Brief flash | Data pushed to PIT app |

---

## Installation & Configuration

1. Flash to ESP32 (same board config as Vehicle Node)
2. Note the Hub's WiFi MAC address from serial output — needed by Marshal Nodes
3. Flash all Marshal Nodes with this Hub MAC in `HUB_MAC[]`
4. Set `START_FINISH_NODE` to match the `NODE_ID` of your start/finish Marshal Node (default `"M-SF"`)
5. Power on all nodes before starting a session
6. Connect PIT Manager app to `Reycin_HUB_XXXXXX` WiFi, then open WebSocket to `ws://192.168.5.1:82`
7. Confirm each Marshal Node appears in `full_state.marshals[]` before beginning timed session

---

## Multi-Vehicle Lap Attribution

In the current v1 implementation, lap attribution in multi-vehicle sessions uses **telemetry proximity timing** — the vehicle whose most recent telemetry frame arrived closest in time to the crossing event is assigned the lap.

This is sufficient for small fleets (2–4 cars) with regular telemetry (5Hz+). For larger fields or higher precision, the recommended upgrade path is:

1. Install GPS on the Start/Finish Marshal Node
2. Use vehicle GPS coordinates at crossing time to identify which car is physically at the line
3. Implement in Hub firmware as `resolveVehicleByProximity(nodeGPSLat, nodeGPSLon)`

---

*Hub Node Firmware is part of the Reycin Race Network. See OBD_ESP32_FIRMWARE.md (Vehicle Node) and MARSHAL_NODE_FIRMWARE.md (Marshal Node) for the complete mesh architecture.*
