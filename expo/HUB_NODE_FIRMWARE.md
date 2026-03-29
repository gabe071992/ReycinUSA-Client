# Reycin Hub Node Firmware Specification

**Version:** 2.0.0  
**Device Role:** Central race control aggregator, lap timing engine, PIT Manager server  
**Target Hardware:** ESP32-WROOM-32 (ESP32-S3 recommended for memory headroom)  
**Communication:** ESP-NOW (from Marshal/Vehicle nodes inbound) + WiFi AP + WebSocket (to PIT Manager app + Driver app)

---

## Changelog: v1.0.0 → v2.0.0

| Gap | Fix |
|---|---|
| Single-client WebSocket (pitClientNum) | Replaced with `ClientRecord clients[4]` array + role handshake |
| No PIT↔Driver message relay | Added `pit_message` and `driver_ack` relay in `handleClientCommand` |
| Simulated RSSI | Real RSSI via `esp_wifi_ap_get_sta_list` + MAC matching |
| JSON buffer too small (512) | Mesh receive buffer bumped to `StaticJsonDocument<768>` |
| GPS source not tracked | `gps_source` field added to `VehicleState`, populated from `gsrc` field |
| Vehicle gps_update not handled | Already implemented in Vehicle Firmware v2.0.0 — no hub change needed |
| Direct `pitClientNum` sends everywhere | All sends replaced with `broadcastToRole()` / `sendToClient()` helpers |

---

## Overview

The Hub Node is the single central authority of the Reycin Race Network. It sits in the pit lane or race control area and serves as the convergence point for all vehicle telemetry and crossing events arriving from the marshal network.

### Primary Responsibilities

1. **Receive** all upstream frames from Marshal Nodes (and direct Vehicle Node broadcasts if in range)
2. **Compute** authoritative lap times using crossing events from the Start/Finish marshal node
3. **Track** all active vehicles simultaneously — position, speed, telemetry, sector times
4. **Serve** real-time race data to both the PIT Manager app and Driver app over a local WiFi WebSocket server
5. **Relay** messages between PIT Manager and Driver app (pit_message / driver_ack)
6. **Accept** race control commands from the PIT Manager app and relay them back into the mesh as needed
7. **Log** session data in-memory for the duration of a race session

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
                                              ┌──────────┴──────────┐
                                       [Driver App]          [PIT Manager App]
                                       role: "driver"         role: "pit"
                                       (Phone on car)         (Tablet / iPad)
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

No serial peripherals required on the Hub. All I/O is through WiFi (PIT app + Driver app) and ESP-NOW (mesh).

---

## Required Libraries

> **Critical:** The firmware uses the ArduinoJson **v6** API (`StaticJsonDocument`). Installing ArduinoJson v7 will produce deprecation warnings and the `createNestedObject` / `createNestedArray` calls will need to be updated. Pin the library to v6.x to compile without warnings.

| Library | Author | Version | Install via | Notes |
|---|---|---|---|---|
| **esp32** (board package) | Espressif | **2.0.17** | Arduino IDE → Boards Manager | Use v2.x branch. v3.x removes `tcpip_adapter.h` which is required by `refreshClientRSSI()`. Do NOT use v3.x without replacing that call. |
| **ArduinoJson** | Benoit Blanchon | **6.21.5** | Arduino IDE → Library Manager | Must be v6.x. v7 deprecates `StaticJsonDocument` and `createNestedObject`. |
| **WebSockets** (arduinoWebSockets) | Markus Sattler | **2.4.1** | Arduino IDE → Library Manager | Provides `WebSocketsServer`. Search "WebSockets by Markus Sattler". |

### Built-in (no install required — included with ESP32 board package)

| Header | Provided by |
|---|---|
| `WiFi.h` | ESP32 Arduino Core |
| `esp_now.h` | ESP32 Arduino Core |
| `esp_wifi.h` | ESP32 Arduino Core |
| `tcpip_adapter.h` | ESP32 Arduino Core v2.x only |
| `EEPROM.h` | ESP32 Arduino Core |

### Arduino IDE Board Manager URL

Add this URL under **File → Preferences → Additional Boards Manager URLs**:

```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

Then install: **esp32 by Espressif Systems — version 2.0.17**

---

## Complete Arduino Firmware (.ino)

```cpp
/*
 * Reycin USA — Hub Node Firmware
 * Version: 2.0.0
 * Role: Race network aggregator, lap timing engine, WebSocket server for PIT + Driver apps
 *
 * v2.0.0 changes:
 *   - Multi-client WebSocket with role-based routing (driver / pit)
 *   - pit_message and driver_ack relay between roles
 *   - Real per-client RSSI via esp_wifi_ap_get_sta_list
 *   - GPS source field tracked in VehicleState
 *   - Mesh receive buffer increased to 768 bytes
 *   - broadcastToRole() helper replaces all direct pitClientNum sends
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <tcpip_adapter.h>
#include <EEPROM.h>

// ─── Identity ─────────────────────────────────────────────────────────────────
#define FIRMWARE_VERSION    "2.0.0"
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
#define MAX_WS_CLIENTS      4
#define VEHICLE_TIMEOUT_MS  30000
#define CROSSING_WINDOW_MS  10000
#define EEPROM_SIZE         512
#define RSSI_REFRESH_MS     2000   // Refresh client RSSI every 2s

// ─── Race Session State ───────────────────────────────────────────────────────
typedef enum {
  SESSION_IDLE,
  SESSION_WARMUP,
  SESSION_ACTIVE,
  SESSION_PAUSED,
  SESSION_FINISHED
} SessionState;

SessionState sessionState = SESSION_IDLE;
unsigned long sessionStartMs = 0;
char  sessionId[16] = "";
char  sessionName[32] = "Race Session";
int   sessionLapTarget = 0;

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
  uint32_t lapTimeMs;
  uint32_t crossingMs;
  char     triggerNode[8];
};

struct VehicleState {
  char     id[8];
  bool     active;
  bool     onTrack;

  float    lat;
  float    lon;
  float    speed_kmh;
  float    heading;
  uint32_t lastSeenMs;

  // Gap 5 — GPS source tracked
  char     gps_source[8]; // "esp32", "phone", or "none"

  uint8_t  obdState;
  int      rpm;
  int      ect_c;
  int      throttle_pct;
  float    vbat;
  bool     sessionActive;

  uint32_t lapCount;
  uint32_t lastCrossingMs;
  LapRecord laps[MAX_LAPS_PER_CAR];

  uint32_t sectorStartMs;
  char     currentSector[8];

  uint32_t bestLapMs;
  uint32_t lastLapMs;
};

VehicleState vehicles[MAX_VEHICLES] = {};

// ─── Marshal Node Registry ────────────────────────────────────────────────────
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

// ─── WebSocket Client Registry (Gap 1) ───────────────────────────────────────
/*
 * Each connecting client must send a register message:
 *   { "type": "register", "role": "driver" | "pit" }
 *
 * Until registered, the client is held in role "" (pending).
 * Messages from unregistered clients are rejected except for "register".
 *
 * Maximum 4 simultaneous clients (typically 1 driver + 1 pit tablet).
 */
struct ClientRecord {
  uint8_t  num;
  char     role[8];    // "driver", "pit", or "" (pending)
  bool     connected;
  uint8_t  mac[6];
  int      rssi;
};

ClientRecord clients[MAX_WS_CLIENTS] = {};

WebSocketsServer pitServer = WebSocketsServer(WEBSOCKET_PORT);
unsigned long lastFullBroadcastMs  = 0;
unsigned long lastRSSIRefreshMs    = 0;
#define FULL_BROADCAST_INTERVAL_MS 1000

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

  memset(clients, 0, sizeof(clients));

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

  if (now - lastFullBroadcastMs >= FULL_BROADCAST_INTERVAL_MS) {
    if (hasConnectedRole("pit")) broadcastFullState();
    lastFullBroadcastMs = now;
  }

  if (now - lastRSSIRefreshMs >= RSSI_REFRESH_MS) {
    refreshClientRSSI();
    lastRSSIRefreshMs = now;
  }

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
  WiFi.softAP(ssid.c_str(), AP_PASSWORD, 6);
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
//  CLIENT REGISTRY HELPERS (Gap 1 + Gap 3)
// ─────────────────────────────────────────────────────────────────────────────
ClientRecord* findClient(uint8_t num) {
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (clients[i].connected && clients[i].num == num) return &clients[i];
  }
  return nullptr;
}

ClientRecord* allocClient(uint8_t num) {
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (!clients[i].connected) {
      memset(&clients[i], 0, sizeof(ClientRecord));
      clients[i].num       = num;
      clients[i].connected = true;
      clients[i].rssi      = -99;
      return &clients[i];
    }
  }
  return nullptr;
}

void freeClient(uint8_t num) {
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (clients[i].num == num) {
      memset(&clients[i], 0, sizeof(ClientRecord));
      return;
    }
  }
}

bool hasConnectedRole(const char* role) {
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (clients[i].connected && strcmp(clients[i].role, role) == 0) return true;
  }
  return false;
}

// Gap 7 — Route message to all clients matching a role
void broadcastToRole(const char* role, const String& json) {
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (clients[i].connected && strcmp(clients[i].role, role) == 0) {
      pitServer.sendTXT(clients[i].num, json);
    }
  }
  flashLED(LED_PIT_TX);
}

// Send to all connected registered clients regardless of role
void broadcastToAll(const String& json) {
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (clients[i].connected && strlen(clients[i].role) > 0) {
      pitServer.sendTXT(clients[i].num, json);
    }
  }
  flashLED(LED_PIT_TX);
}

void sendToClient(uint8_t num, const String& json) {
  pitServer.sendTXT(num, json);
  flashLED(LED_PIT_TX);
}

// Gap 3 — Refresh per-client RSSI using WiFi station list
void refreshClientRSSI() {
  wifi_sta_list_t staList;
  tcpip_adapter_sta_list_t ipList;

  if (esp_wifi_ap_get_sta_list(&staList) != ESP_OK) return;
  if (tcpip_adapter_get_sta_list(&staList, &ipList) != ESP_OK) return;

  for (int c = 0; c < MAX_WS_CLIENTS; c++) {
    if (!clients[c].connected) continue;

    // Get the remote IP of this WebSocket client from the server
    IPAddress clientIP = pitServer.remoteIP(clients[c].num);

    for (int s = 0; s < ipList.num; s++) {
      if (ipList.sta[s].ip.addr == (uint32_t)clientIP) {
        clients[c].rssi = staList.sta[s].rssi;
        memcpy(clients[c].mac, staList.sta[s].mac, 6);
        break;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESP-NOW RECEIVE — All inbound mesh frames (Gap 4: buffer bumped to 768)
// ─────────────────────────────────────────────────────────────────────────────
void onMeshFrameReceived(const uint8_t* senderMAC, const uint8_t* data, int len) {
  flashLED(LED_STATUS);

  // Gap 4 — 768 bytes to handle GPS + OBD + relay headers without truncation
  StaticJsonDocument<768> doc;
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
//  TELEMETRY FRAME PROCESSING (Gap 5: gps_source populated)
// ─────────────────────────────────────────────────────────────────────────────
void processTelemetryFrame(const StaticJsonDocument<768>& doc) {
  const char* vehicleId = doc["id"] | "";
  if (strlen(vehicleId) == 0) return;

  VehicleState* v = getOrCreateVehicle(vehicleId);
  if (!v) return;

  v->active        = true;
  v->onTrack       = true;
  v->lastSeenMs    = millis();
  v->sessionActive = doc["sess"] | false;

  if (doc.containsKey("lat")) {
    v->lat       = doc["lat"] | 0.0f;
    v->lon       = doc["lon"] | 0.0f;
    v->speed_kmh = doc["spd"] | 0.0f;
    v->heading   = doc["hdg"] | 0.0f;
  }

  // Gap 5 — GPS source: 0 = esp32 hardware, 1 = phone fallback, absent = none
  if (doc.containsKey("gsrc")) {
    int gsrc = doc["gsrc"] | -1;
    if      (gsrc == 0) strncpy(v->gps_source, "esp32", 7);
    else if (gsrc == 1) strncpy(v->gps_source, "phone", 7);
    else                strncpy(v->gps_source, "none",  7);
  } else if (!doc.containsKey("lat")) {
    strncpy(v->gps_source, "none", 7);
  }

  v->obdState     = doc["obd"]  | 0;
  if (doc.containsKey("rpm"))  v->rpm          = doc["rpm"];
  if (doc.containsKey("ect"))  v->ect_c        = doc["ect"];
  if (doc.containsKey("tps"))  v->throttle_pct = doc["tps"];
  if (doc.containsKey("vbat")) v->vbat         = doc["vbat"];

  const char* via = doc["via"] | "";
  if (strlen(via) > 0) updateMarshalRecord(via, doc);

  if (hasConnectedRole("pit")) pushTelemetryToPIT(v, doc);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CROSSING EVENT PROCESSING — Lap Timing Engine
// ─────────────────────────────────────────────────────────────────────────────
#define START_FINISH_NODE   "M-SF"

void processCrossingEvent(const StaticJsonDocument<768>& doc) {
  const char* nodeId    = doc["node"] | "";
  uint32_t    crossingMs = doc["ms"] | millis();

  Serial.printf("[LAP] Crossing at node %s at %lu ms\n", nodeId, crossingMs);

  updateMarshalRecordByName(nodeId);
  flashLED(LED_LAP);

  if (strcmp(nodeId, START_FINISH_NODE) == 0) {
    VehicleState* v = resolveVehicleForCrossing(crossingMs);
    if (v) {
      recordLapCrossing(v, nodeId, crossingMs);
    } else {
      pushUnmatchedCrossingToPIT(nodeId, crossingMs);
    }
  } else {
    VehicleState* v = resolveVehicleForCrossing(crossingMs);
    if (v) recordSectorCrossing(v, nodeId, crossingMs);
  }

  // Raw crossing event — pit only
  StaticJsonDocument<256> evt;
  evt["type"]   = "crossing";
  evt["node"]   = nodeId;
  evt["ms"]     = crossingMs;
  evt["source"] = doc["source"] | "unknown";
  String json;
  serializeJson(evt, json);
  broadcastToRole("pit", json);
}

void recordLapCrossing(VehicleState* v, const char* nodeId, uint32_t crossingMs) {
  if (v->lastCrossingMs > 0 &&
      (crossingMs - v->lastCrossingMs) < CROSSING_WINDOW_MS) {
    Serial.printf("[LAP] Debounced crossing for %s (too soon)\n", v->id);
    return;
  }

  if (v->lastCrossingMs == 0) {
    v->lastCrossingMs = crossingMs;
    v->sectorStartMs  = crossingMs;
    Serial.printf("[LAP] Timing started for vehicle %s\n", v->id);

    StaticJsonDocument<128> msg;
    msg["type"]    = "lap_start";
    msg["vehicle"] = v->id;
    msg["ms"]      = crossingMs;
    String json;
    serializeJson(msg, json);
    // Lap start → both roles (driver needs to know timing has begun)
    broadcastToAll(json);
    return;
  }

  uint32_t lapTimeMs = crossingMs - v->lastCrossingMs;
  v->lastCrossingMs  = crossingMs;
  v->lastLapMs       = lapTimeMs;
  if (v->bestLapMs == 0 || lapTimeMs < v->bestLapMs) {
    v->bestLapMs = lapTimeMs;
  }

  if (v->lapCount < MAX_LAPS_PER_CAR) {
    LapRecord& lap   = v->laps[v->lapCount];
    lap.lapNumber    = v->lapCount + 1;
    lap.lapTimeMs    = lapTimeMs;
    lap.crossingMs   = crossingMs;
    strncpy(lap.triggerNode, nodeId, 7);
  }
  v->lapCount++;

  Serial.printf("[LAP] Vehicle %s — Lap %lu: %lu ms (%s)\n",
    v->id, v->lapCount, lapTimeMs, formatLapTime(lapTimeMs).c_str());

  StaticJsonDocument<256> msg;
  msg["type"]        = "lap_completed";
  msg["vehicle"]     = v->id;
  msg["lap"]         = v->lapCount;
  msg["lap_ms"]      = lapTimeMs;
  msg["lap_time"]    = formatLapTime(lapTimeMs);
  msg["best_ms"]     = v->bestLapMs;
  msg["best_time"]   = formatLapTime(v->bestLapMs);
  msg["crossing_ms"] = crossingMs;
  String json;
  serializeJson(msg, json);
  // Lap completed → both roles (driver needs lap time; pit needs race data)
  broadcastToAll(json);
  flashLED(LED_LAP);

  if (sessionLapTarget > 0 && (int)v->lapCount >= sessionLapTarget) {
    Serial.printf("[SESSION] Lap target reached for %s\n", v->id);
  }
}

void recordSectorCrossing(VehicleState* v, const char* nodeId, uint32_t crossingMs) {
  uint32_t sectorTimeMs = crossingMs - v->sectorStartMs;
  v->sectorStartMs = crossingMs;
  strncpy(v->currentSector, nodeId, 7);

  Serial.printf("[SECTOR] Vehicle %s at %s: %lu ms\n", v->id, nodeId, sectorTimeMs);

  StaticJsonDocument<256> msg;
  msg["type"]        = "sector";
  msg["vehicle"]     = v->id;
  msg["node"]        = nodeId;
  msg["sector_ms"]   = sectorTimeMs;
  msg["sector_time"] = formatLapTime(sectorTimeMs);
  String json;
  serializeJson(msg, json);
  // Sector splits → both roles
  broadcastToAll(json);
}

// ─────────────────────────────────────────────────────────────────────────────
//  VEHICLE RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
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
//  PIT MANAGER WEBSOCKET SERVER (Gap 1: role-based handshake)
// ─────────────────────────────────────────────────────────────────────────────
void onPITWebSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED: {
      ClientRecord* c = findClient(num);
      if (c) {
        Serial.printf("[PIT] Client %u (%s) disconnected\n", num, c->role);
        freeClient(num);
      }
      break;
    }

    case WStype_CONNECTED: {
      Serial.printf("[PIT] Client %u connected — awaiting role registration\n", num);
      ClientRecord* c = allocClient(num);
      if (!c) {
        // No slots — reject
        pitServer.disconnect(num);
        Serial.println("[PIT] Max clients reached — rejected");
        return;
      }

      // Send role request — client must respond with { "type": "register", "role": "driver"|"pit" }
      StaticJsonDocument<128> req;
      req["type"]      = "role_request";
      req["version"]   = FIRMWARE_VERSION;
      req["device_id"] = getDeviceID();
      String json;
      serializeJson(req, json);
      pitServer.sendTXT(num, json);
      break;
    }

    case WStype_TEXT: {
      StaticJsonDocument<512> doc;
      if (deserializeJson(doc, payload, length) == DeserializationError::Ok) {
        handleClientMessage(num, doc);
      }
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CLIENT MESSAGE ROUTER
// ─────────────────────────────────────────────────────────────────────────────
void handleClientMessage(uint8_t num, const StaticJsonDocument<512>& doc) {
  String msgType = doc["type"] | "";
  ClientRecord* c = findClient(num);
  if (!c) return;

  // ── Registration (Gap 1) ────────────────────────────────────────────────────
  if (msgType == "register") {
    const char* role = doc["role"] | "";
    if (strcmp(role, "driver") == 0 || strcmp(role, "pit") == 0) {
      strncpy(c->role, role, 7);
      Serial.printf("[PIT] Client %u registered as '%s'\n", num, role);

      // Send handshake confirmation
      StaticJsonDocument<256> ack;
      ack["type"]    = "hub_connected";
      ack["version"] = FIRMWARE_VERSION;
      ack["role"]    = role;
      ack["session"] = sessionId;
      ack["state"]   = sessionStateStr();
      ack["flag"]    = flagStr();
      String json;
      serializeJson(ack, json);
      sendToClient(num, json);

      // Send immediate full state to pit clients
      if (strcmp(role, "pit") == 0) broadcastFullState();
    } else {
      pitServer.disconnect(num);
      freeClient(num);
      Serial.printf("[PIT] Client %u sent invalid role — disconnected\n", num);
    }
    return;
  }

  // Reject unregistered clients for all other messages
  if (strlen(c->role) == 0) {
    Serial.printf("[PIT] Client %u sent command before registering — ignored\n", num);
    return;
  }

  // ── Gap 2: inter-client message relay ───────────────────────────────────────
  if (msgType == "pit_message") {
    // PIT → Driver: relay to all driver-role clients
    Serial.printf("[MSG] pit_message from client %u → driver(s)\n", num);
    StaticJsonDocument<512> relay;
    relay["type"]       = "pit_message";
    relay["sender"]     = "pit";
    relay["text"]       = doc["text"] | "";
    relay["message_id"] = doc["message_id"] | "";
    relay["timestamp"]  = doc["timestamp"]  | millis();
    String json;
    serializeJson(relay, json);
    broadcastToRole("driver", json);
    return;
  }

  if (msgType == "driver_ack") {
    // Driver → PIT: relay acknowledgement to all pit-role clients
    Serial.printf("[MSG] driver_ack from client %u → pit\n", num);
    StaticJsonDocument<256> relay;
    relay["type"]       = "driver_ack";
    relay["message_id"] = doc["message_id"] | "";
    relay["timestamp"]  = doc["timestamp"]  | millis();
    String json;
    serializeJson(relay, json);
    broadcastToRole("pit", json);
    return;
  }

  // ── Standard PIT commands (pit-role only) ───────────────────────────────────
  if (strcmp(c->role, "pit") != 0) {
    // Driver clients only send register, pit_message relay responses, and driver_ack
    Serial.printf("[PIT] Client %u (driver) sent unknown type: %s\n", num, msgType.c_str());
    return;
  }

  handlePITCommand(num, doc);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PIT COMMAND HANDLER
// ─────────────────────────────────────────────────────────────────────────────
void handlePITCommand(uint8_t num, const StaticJsonDocument<512>& doc) {
  String cmd = doc["command"] | "";
  Serial.printf("[PIT] Command: %s\n", cmd.c_str());

  if (cmd == "start_session") {
    sessionState   = SESSION_ACTIVE;
    sessionStartMs = millis();
    const char* name = doc["name"] | "Race Session";
    strncpy(sessionName, name, 31);
    sessionLapTarget = doc["laps"] | 0;
    clearAllLaps();
    replyClient(num, "session_started", true);

  } else if (cmd == "stop_session") {
    sessionState = SESSION_FINISHED;
    replyClient(num, "session_stopped", true);

  } else if (cmd == "pause_session") {
    sessionState = SESSION_PAUSED;
    replyClient(num, "session_paused", true);

  } else if (cmd == "resume_session") {
    sessionState = SESSION_ACTIVE;
    replyClient(num, "session_resumed", true);

  } else if (cmd == "set_flag") {
    String flag = doc["flag"] | "none";
    setFlag(flag);
    pushFlagToAll();

  } else if (cmd == "get_full_state") {
    broadcastFullState();

  } else if (cmd == "get_laps") {
    const char* vid = doc["vehicle"] | "";
    sendLapHistoryToClient(num, vid);

  } else if (cmd == "reset_vehicle_laps") {
    const char* vid = doc["vehicle"] | "";
    resetVehicleLaps(vid);
    replyClient(num, "laps_reset", true);

  } else if (cmd == "manual_lap") {
    const char* vid = doc["vehicle"] | "";
    VehicleState* v = findVehicle(vid);
    if (v) recordLapCrossing(v, "MANUAL", millis());
    replyClient(num, "manual_lap_recorded", v != nullptr);

  } else if (cmd == "ping") {
    replyClient(num, "pong", true);
  }
}

void replyClient(uint8_t num, const char* event, bool success) {
  StaticJsonDocument<128> doc;
  doc["type"]    = event;
  doc["success"] = success;
  doc["uptime"]  = millis();
  String json;
  serializeJson(doc, json);
  sendToClient(num, json);
}

// ─────────────────────────────────────────────────────────────────────────────
//  PIT APP DATA PUSH (Gap 7: all sends use broadcastToRole / sendToClient)
// ─────────────────────────────────────────────────────────────────────────────
void pushTelemetryToPIT(VehicleState* v, const StaticJsonDocument<768>& src) {
  StaticJsonDocument<512> doc;
  doc["type"]       = "telemetry";
  doc["vehicle"]    = v->id;
  doc["speed_kmh"]  = v->speed_kmh;
  doc["heading"]    = v->heading;
  doc["lat"]        = v->lat;
  doc["lon"]        = v->lon;
  doc["gps_source"] = v->gps_source;  // Gap 5
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

  if (src.containsKey("via"))  doc["via"]  = src["via"];
  if (src.containsKey("hops")) doc["hops"] = src["hops"];

  String json;
  serializeJson(doc, json);
  broadcastToRole("pit", json);
}

// Full race state — sent every 1s to all pit clients
// Gap 3: includes per-client RSSI in clients[] array
void broadcastFullState() {
  StaticJsonDocument<1024> doc;
  doc["type"]       = "full_state";
  doc["session"]    = sessionId;
  doc["state"]      = sessionStateStr();
  doc["flag"]       = flagStr();
  doc["elapsed_ms"] = (sessionState == SESSION_ACTIVE) ? (millis() - sessionStartMs) : 0;

  JsonArray arr = doc.createNestedArray("vehicles");
  for (int i = 0; i < MAX_VEHICLES; i++) {
    VehicleState& v = vehicles[i];
    if (!v.active) continue;

    JsonObject vo      = arr.createNestedObject();
    vo["id"]           = v.id;
    vo["on_track"]     = v.onTrack;
    vo["lap"]          = v.lapCount;
    vo["last_lap"]     = formatLapTime(v.lastLapMs);
    vo["best_lap"]     = formatLapTime(v.bestLapMs);
    vo["speed_kmh"]    = v.speed_kmh;
    vo["lat"]          = v.lat;
    vo["lon"]          = v.lon;
    vo["gps_source"]   = v.gps_source;  // Gap 5
    vo["obd_state"]    = v.obdState;
    vo["last_seen_ms"] = millis() - v.lastSeenMs;
  }

  JsonArray mArr = doc.createNestedArray("marshals");
  for (int i = 0; i < MAX_MARSHALS; i++) {
    if (!marshals[i].active) continue;
    JsonObject mo = mArr.createNestedObject();
    mo["id"]     = marshals[i].id;
    mo["rssi"]   = marshals[i].rssi;
    mo["age_ms"] = millis() - marshals[i].lastSeenMs;
  }

  // Gap 3 — real RSSI per connected client
  JsonArray cArr = doc.createNestedArray("clients");
  for (int i = 0; i < MAX_WS_CLIENTS; i++) {
    if (!clients[i].connected || strlen(clients[i].role) == 0) continue;
    JsonObject co  = cArr.createNestedObject();
    co["role"]     = clients[i].role;
    co["rssi"]     = clients[i].rssi;
    char macStr[18];
    snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X",
      clients[i].mac[0], clients[i].mac[1], clients[i].mac[2],
      clients[i].mac[3], clients[i].mac[4], clients[i].mac[5]);
    co["mac"] = macStr;
  }

  String json;
  serializeJson(doc, json);
  broadcastToRole("pit", json);
}

void sendLapHistoryToClient(uint8_t num, const char* vehicleId) {
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
  sendToClient(num, json);
}

void pushUnmatchedCrossingToPIT(const char* nodeId, uint32_t crossingMs) {
  StaticJsonDocument<128> doc;
  doc["type"] = "unmatched_crossing";
  doc["node"] = nodeId;
  doc["ms"]   = crossingMs;
  String json;
  serializeJson(doc, json);
  broadcastToRole("pit", json);
}

void pushFlagToAll() {
  StaticJsonDocument<64> doc;
  doc["type"] = "flag";
  doc["flag"] = flagStr();
  String json;
  serializeJson(doc, json);
  // Flag → both roles (driver needs to see it on dash)
  broadcastToAll(json);
}

// ─────────────────────────────────────────────────────────────────────────────
//  VEHICLE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
VehicleState* getOrCreateVehicle(const char* id) {
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (vehicles[i].active && strcmp(vehicles[i].id, id) == 0) return &vehicles[i];
  }
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (!vehicles[i].active) {
      memset(&vehicles[i], 0, sizeof(VehicleState));
      strncpy(vehicles[i].id, id, 7);
      strncpy(vehicles[i].gps_source, "none", 7);
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
void updateMarshalRecord(const char* id, const StaticJsonDocument<768>& doc) {
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
  StaticJsonDocument<768> dummy;
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
  if (hasConnectedRole("pit") || hasConnectedRole("driver")) {
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
    int cc = 0;
    for (int i = 0; i < MAX_WS_CLIENTS; i++) if (clients[i].connected) cc++;
    Serial.printf("[HUB] WS Clients: %d\n", cc);
    for (int i = 0; i < MAX_WS_CLIENTS; i++) {
      if (!clients[i].connected) continue;
      Serial.printf("  [%u] role=%s rssi=%d\n", clients[i].num, clients[i].role, clients[i].rssi);
    }
    int vc = 0;
    for (int i = 0; i < MAX_VEHICLES; i++) if (vehicles[i].active) vc++;
    Serial.printf("[HUB] Active vehicles: %d\n", vc);

  } else if (cmd == "laps") {
    for (int i = 0; i < MAX_VEHICLES; i++) {
      if (!vehicles[i].active) continue;
      Serial.printf("  [%s] Laps: %lu  Best: %s  Last: %s  GPS: %s\n",
        vehicles[i].id, vehicles[i].lapCount,
        formatLapTime(vehicles[i].bestLapMs).c_str(),
        formatLapTime(vehicles[i].lastLapMs).c_str(),
        vehicles[i].gps_source);
    }

  } else if (cmd == "reset") {
    ESP.restart();

  } else if (cmd.startsWith("flag ")) {
    setFlag(cmd.substring(5));
    pushFlagToAll();
  }
}
```

---

## Connection & Role Handshake Flow

```
Client connects
      │
      ▼
Hub sends { "type": "role_request", "version": "2.0.0", "device_id": "XXXXXX" }
      │
      ▼
Client sends { "type": "register", "role": "driver" | "pit" }
      │
      ▼
Hub sends { "type": "hub_connected", "role": "...", "session": "...", "state": "...", "flag": "..." }
      │
      ├─ role = "pit"    → Hub immediately sends full_state + begins 1s full_state broadcast
      └─ role = "driver" → Hub sends lap_completed / flag events as they occur
```

If a client sends any message other than `register` before registering, it is silently ignored. If an invalid role is sent, the client is disconnected.

---

## Message Relay Flow (Gap 2)

```
PIT Manager sends:
  { "type": "pit_message", "text": "BOX THIS LAP", "message_id": "m_001", "timestamp": 123456 }
      │
      ▼
Hub relays to ALL driver-role clients:
  { "type": "pit_message", "sender": "pit", "text": "BOX THIS LAP", "message_id": "m_001", "timestamp": 123456 }

Driver app sends:
  { "type": "driver_ack", "message_id": "m_001", "timestamp": 123457 }
      │
      ▼
Hub relays to ALL pit-role clients:
  { "type": "driver_ack", "message_id": "m_001", "timestamp": 123457 }
```

---

## Message Routing Table

| Message / Event | Pit Clients | Driver Clients |
|---|---|---|
| `full_state` (1s broadcast) | ✅ | ❌ |
| `telemetry` (live per vehicle) | ✅ | ❌ |
| `lap_completed` | ✅ | ✅ |
| `lap_start` | ✅ | ✅ |
| `sector` | ✅ | ✅ |
| `crossing` (raw) | ✅ | ❌ |
| `unmatched_crossing` | ✅ | ❌ |
| `flag` | ✅ | ✅ |
| `pit_message` relay | ❌ | ✅ |
| `driver_ack` relay | ✅ | ❌ |
| `hub_connected` | ✅ | ✅ |

---

## PIT Manager WebSocket API

The Hub serves all clients at `ws://192.168.5.1:82`.  
WiFi SSID: `Reycin_HUB_XXXXXX` / Password: `reycinpit`

### Hub → Client (Push Events)

| Message `type` | Recipients | Trigger | Description |
|---|---|---|---|
| `role_request` | new client | Connection | Prompts client to identify itself |
| `hub_connected` | registering client | After register | Handshake confirmation with session state |
| `full_state` | pit | Every 1 second | All vehicles, marshals, clients + RSSI, session state |
| `telemetry` | pit | Per vehicle frame received | Live position + speed + OBD + GPS source for one vehicle |
| `lap_completed` | both | Every lap crossing | Lap number, time, best lap |
| `lap_start` | both | First crossing for vehicle | Timing has started |
| `sector` | both | Non-SF marshal crossing | Sector split time |
| `crossing` | pit | Any marshal crossing | Raw crossing event |
| `unmatched_crossing` | pit | Crossing with no vehicle | Review required |
| `flag` | both | Flag state change | Current flag color |
| `pit_message` | driver | PIT → Driver relay | PIT operator message |
| `driver_ack` | pit | Driver → PIT relay | Driver acknowledgement |

### Client → Hub (Commands)

| `type` / `command` | Sender role | Payload | Description |
|---|---|---|---|
| `register` | any | `{ "role": "driver"\|"pit" }` | Role registration — required before any other message |
| `pit_message` | pit | `{ "text": "...", "message_id": "...", "timestamp": N }` | Send message to driver |
| `driver_ack` | driver | `{ "message_id": "...", "timestamp": N }` | Acknowledge a pit_message |
| `start_session` | pit | `{ "name": "Race 1", "laps": 10 }` | Begin timed session |
| `stop_session` | pit | — | End session |
| `pause_session` | pit | — | Pause timing |
| `resume_session` | pit | — | Resume timing |
| `set_flag` | pit | `{ "flag": "yellow" }` | Set flag state |
| `get_full_state` | pit | — | Request immediate full state push |
| `get_laps` | pit | `{ "vehicle": "A3F921" }` | Request full lap history |
| `reset_vehicle_laps` | pit | `{ "vehicle": "A3F921" }` | Reset lap count |
| `manual_lap` | pit | `{ "vehicle": "A3F921" }` | Force a lap recording |
| `ping` | pit | — | Connectivity check |

---

## Full State Frame Example (v2.0.0)

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
      "gps_source": "esp32",
      "obd_state": 2,
      "last_seen_ms": 180
    }
  ],
  "marshals": [
    { "id": "M-SF", "rssi": -55, "age_ms": 200 },
    { "id": "M-T3", "rssi": -70, "age_ms": 350 }
  ],
  "clients": [
    { "role": "pit",    "rssi": -42, "mac": "AA:BB:CC:DD:EE:FF" },
    { "role": "driver", "rssi": -61, "mac": "11:22:33:44:55:66" }
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

## Telemetry Push Example (v2.0.0 — includes gps_source)

```json
{
  "type": "telemetry",
  "vehicle": "A3F921",
  "speed_kmh": 112,
  "heading": 247,
  "lat": 36.1597,
  "lon": -96.5916,
  "gps_source": "phone",
  "lap": 4,
  "last_lap": "01:23.456",
  "best_lap": "01:21.102",
  "obd_state": 2,
  "rpm": 6400,
  "ect": 92,
  "tps": 87,
  "vbat": 13.8,
  "via": "M-T3",
  "hops": 2
}
```

`gps_source` values: `"esp32"` (hardware GPS on vehicle), `"phone"` (fallback from connected phone), `"none"` (no GPS data).

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
| LED_STATUS (GPIO 2) | Solid ON | At least one client connected (any role) |
| LED_STATUS (GPIO 2) | Slow blink 800ms | No clients connected |
| LED_LAP (GPIO 4) | Brief flash | Lap or crossing recorded |
| LED_PIT_TX (GPIO 5) | Brief flash | Data pushed to any client |

---

## Vehicle Firmware Alignment Note (Gap 6)

The Vehicle Node Firmware v2.0.0 (`OBD_ESP32_FIRMWARE.md`) already implements the `gps_update` command handler. When the phone app detects the hardware GPS block is absent from telemetry frames, it begins sending:

```json
{ "command": "gps_update", "lat": 36.1, "lon": -96.5, "speed_kmh": 80.0, "heading": 247.0, "alt_m": 284.0 }
```

The vehicle firmware stores this in `phoneGps` and includes it in subsequent mesh frames with `"gsrc": 1`. The Hub receives `gsrc: 1` and stores `gps_source = "phone"` in `VehicleState`. No Hub firmware changes are required for Gap 6.

---

## Installation & Configuration

1. Flash to ESP32 (same board config as Vehicle Node)
2. Note the Hub's WiFi MAC address from serial output — needed by Marshal Nodes
3. Flash all Marshal Nodes with this Hub MAC in `HUB_MAC[]`
4. Set `START_FINISH_NODE` to match the `NODE_ID` of your start/finish Marshal Node (default `"M-SF"`)
5. Power on all nodes before starting a session
6. Connect Driver app to `Reycin_HUB_XXXXXX` WiFi, open WebSocket to `ws://192.168.5.1:82`, send `{ "type": "register", "role": "driver" }`
7. Connect PIT Manager app to same WiFi, same WebSocket, send `{ "type": "register", "role": "pit" }`
8. Confirm each Marshal Node appears in `full_state.marshals[]` before beginning timed session

---

## Multi-Vehicle Lap Attribution

In the current v2 implementation, lap attribution in multi-vehicle sessions uses **telemetry proximity timing** — the vehicle whose most recent telemetry frame arrived closest in time to the crossing event is assigned the lap.

This is sufficient for small fleets (2–4 cars) with regular telemetry (5Hz+). For larger fields or higher precision, the recommended upgrade path is:

1. Install GPS on the Start/Finish Marshal Node
2. Use vehicle GPS coordinates at crossing time to identify which car is physically at the line
3. Implement in Hub firmware as `resolveVehicleByProximity(nodeGPSLat, nodeGPSLon)`

---

*Hub Node Firmware is part of the Reycin Race Network. See OBD_ESP32_FIRMWARE.md (Vehicle Node) and MARSHAL_NODE_FIRMWARE.md (Marshal Node) for the complete mesh architecture.*
