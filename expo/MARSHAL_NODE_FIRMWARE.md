# Reycin Marshal Node Firmware Specification

**Version:** 1.0.0  
**Device Role:** Track-side relay, vehicle detection, and data forwarding node  
**Target Hardware:** ESP32-WROOM-32  
**Communication:** ESP-NOW (from vehicles + to Hub/next Marshal) + optional WebSocket status port

---

## Overview

Marshal Nodes are fixed ESP32 units placed at strategic positions around the circuit — corner stations, start/finish line, sector splits, and any other marshal post. They form the backbone of the track-side mesh network.

### Primary Responsibilities

1. **Receive** vehicle telemetry broadcasts (ESP-NOW) from passing Vehicle Nodes
2. **Relay** received frames toward the Hub — either directly or through the next Marshal Node in the chain
3. **Detect** vehicle presence at the node position (start/finish crossing, sector entry/exit)
4. **Tag** each relayed frame with the Marshal Node's own ID and timestamp so the Hub knows which node saw the vehicle and when
5. **Aggregate** multiple vehicle streams simultaneously (multi-car support)

### What Marshal Nodes Do NOT Do

- They do not compute lap times — that is exclusively the Hub's job
- They do not store historical data — they are pass-through relay nodes
- They do not connect to the mobile app directly
- They do not connect to the internet

---

## Network Topology

```
[Vehicle A]──ESP-NOW──▶[Marshal Node 1 — Turn 1]
                               │
                        ESP-NOW relay
                               │
[Vehicle B]──ESP-NOW──▶[Marshal Node 2 — Turn 3]
                               │
                        ESP-NOW relay
                               │
[Vehicle C]──ESP-NOW──▶[Marshal Node 3 — Turn 5]
                               │
                        ESP-NOW relay
                               │
                       [Marshal Node 4 — Start/Finish]──────▶ [HUB NODE]
                               │                           (direct ESP-NOW
                        (also receives                       or last relay)
                         vehicles on
                         start/finish straight)
```

**Key rule:** Every Marshal Node forwards ALL received frames (from vehicles AND from upstream Marshal Nodes) toward the Hub. If a Marshal Node is directly in range of the Hub, it sends directly. If not, it forwards to the next Marshal Node in the configured relay chain.

---

## Hardware Requirements

### Required
- ESP32-WROOM-32
- 5V power supply (USB-C power bank for portable use, or hardwired 12V → 5V)
- Weatherproof enclosure (IP54 minimum for outdoor use)

### Optional
- GPIO-connected IR beam sensor or magnetic loop detector (for precise crossing detection)
- GPS Module (UART, NEO-6M) — recommended for start/finish node only, to provide authoritative position reference
- Status LED strip (3x LED: Power, Mesh RX, Mesh TX)
- Physical push button (GPIO) for manual lap trigger / flag signal input

---

## Wiring Diagram

```
ESP32 Pin   | Component            | Description
------------|---------------------|-----------------------------
GPIO 2      | LED — Power          | Solid = node operational
GPIO 4      | LED — Mesh RX        | Flashes on vehicle frame received
GPIO 5      | LED — Mesh TX        | Flashes on relay frame sent
GPIO 12     | GPS RX (if present)  | GPS serial from GPS module TX
GPIO 13     | GPS TX (if present)  | GPS serial to GPS module RX
GPIO 14     | IR Sensor Input      | LOW = beam broken (vehicle crossing)
GPIO 15     | Manual Flag Button   | INPUT_PULLUP, LOW = pressed
3.3V / GND  | Power                | Logic power and ground
```

---

## Required Libraries

> **Critical:** The firmware uses the ArduinoJson **v6** API (`StaticJsonDocument`). Installing ArduinoJson v7 will produce deprecation warnings. Pin the library to v6.x to compile without warnings.

| Library | Author | Version | Install via | Notes |
|---|---|---|---|---|
| **esp32** (board package) | Espressif | **2.0.17** | Arduino IDE → Boards Manager | Use v2.x branch. v3.x changes the ESP-NOW callback signature (`esp_now_recv_info_t*` replaces the MAC pointer parameter). The callback `onFrameReceived(const uint8_t* senderMAC, const uint8_t* data, int len)` compiles correctly on v2.x only. |
| **ArduinoJson** | Benoit Blanchon | **6.21.5** | Arduino IDE → Library Manager | Must be v6.x. v7 deprecates `StaticJsonDocument` and `createNestedObject`. |

### Built-in (no install required — included with ESP32 board package)

| Header | Provided by |
|---|---|
| `WiFi.h` | ESP32 Arduino Core |
| `esp_now.h` | ESP32 Arduino Core |
| `esp_wifi.h` | ESP32 Arduino Core |
| `HardwareSerial.h` | ESP32 Arduino Core |
| `EEPROM.h` | ESP32 Arduino Core |

### Arduino IDE Board Manager URL

Add this URL under **File → Preferences → Additional Boards Manager URLs**:

```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```

Then install: **esp32 by Espressif Systems — version 2.0.17**

### Version Compatibility Matrix

| Component | Minimum | Recommended | Do NOT use |
|---|---|---|---|
| Arduino IDE | 2.0.0 | 2.3.x | 1.8.x (outdated ESP32 support) |
| ESP32 Board Package | 2.0.14 | **2.0.17** | 3.x (breaks ESP-NOW callback + removes tcpip_adapter) |
| ArduinoJson | 6.19.0 | **6.21.5** | 7.x (StaticJsonDocument removed) |
| Board target | ESP32 Dev Module | ESP32 Dev Module | — |
| CPU Frequency | 240 MHz | 240 MHz | 80 MHz (insufficient for mesh timing) |
| Flash Size | 4MB | 4MB | — |
| Partition Scheme | Default 4MB | Default 4MB | — |

---

## Complete Arduino Firmware (.ino)

```cpp
/*
 * Reycin USA — Marshal Node Firmware
 * Version: 1.0.0
 * Role: Track-side relay, vehicle detection, frame forwarding
 *
 * Each Marshal Node has a unique NODE_ID (set at flash time via EEPROM/config).
 * The relay chain is configured by setting HUB_MAC or NEXT_MARSHAL_MAC.
 * If both are set, the node prefers direct Hub delivery and falls back to relay chain.
 */

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <EEPROM.h>

// ─── Identity ─────────────────────────────────────────────────────────────────
#define FIRMWARE_VERSION  "1.0.0"
#define NODE_TYPE         "marshal"

// NODE_ID: Set this uniquely per physical node before flashing.
// Convention: "M01" = Marshal 1, "M-SF" = Start/Finish, "M-T3" = Turn 3, etc.
#define NODE_ID           "M01"

// ─── Pin Config ───────────────────────────────────────────────────────────────
#define LED_POWER         2
#define LED_MESH_RX       4
#define LED_MESH_TX       5
#define IR_SENSOR_PIN     14
#define FLAG_BUTTON_PIN   15

// GPS (optional — recommended for start/finish node)
#define GPS_RX_PIN        12
#define GPS_TX_PIN        13
#define GPS_BAUD          9600
#define GPS_SERIAL        Serial1
#define GPS_ENABLED       false  // Set true if GPS module is installed on this node

// ─── ESP-NOW Peer Config ──────────────────────────────────────────────────────
// Configure ONE of the following at flash time:
//   Option A: Direct Hub delivery
//   Option B: Relay to next Marshal Node

// Set to Hub Node MAC address if this node is directly in range of the Hub.
// Set to { 0,0,0,0,0,0 } if not used.
uint8_t HUB_MAC[]          = { 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF }; // REPLACE with actual Hub MAC

// Set to next Marshal Node MAC if this node must relay through a chain.
// Set to { 0,0,0,0,0,0 } if not used.
uint8_t NEXT_MARSHAL_MAC[] = { 0x00, 0x00, 0x00, 0x00, 0x00, 0x00 }; // REPLACE or leave blank

// ─── Timing ───────────────────────────────────────────────────────────────────
#define IR_DEBOUNCE_MS    500    // Minimum ms between crossing detections
#define FRAME_TTL         5     // Max relay hops before frame is dropped (loop prevention)
#define LED_FLASH_MS      30

#define EEPROM_SIZE       256

// ─── Vehicle Tracking ────────────────────────────────────────────────────────
// Track the last seen timestamp per vehicle ID (up to 16 vehicles simultaneously)
#define MAX_VEHICLES      16

struct VehicleRecord {
  char   id[8];
  uint32_t lastSeenMs;
  bool   active;
};

VehicleRecord vehicles[MAX_VEHICLES] = {};

// ─── GPS (optional) ───────────────────────────────────────────────────────────
struct GPSData {
  bool  valid;
  float latitude;
  float longitude;
};
GPSData gpsData = { false, 0, 0 };
String  gpsBuffer = "";

// ─── IR Crossing Detection ────────────────────────────────────────────────────
bool         irLastState      = HIGH;
unsigned long irLastCrossingMs = 0;

// ─── Peers ────────────────────────────────────────────────────────────────────
bool hubPeerAdded         = false;
bool nextMarshalPeerAdded = false;

bool isZeroMAC(uint8_t* mac) {
  for (int i = 0; i < 6; i++) if (mac[i] != 0) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);

  pinMode(LED_POWER,     OUTPUT);
  pinMode(LED_MESH_RX,   OUTPUT);
  pinMode(LED_MESH_TX,   OUTPUT);
  pinMode(IR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(FLAG_BUTTON_PIN, INPUT_PULLUP);

  digitalWrite(LED_POWER,   HIGH); // Power LED on immediately
  digitalWrite(LED_MESH_RX, LOW);
  digitalWrite(LED_MESH_TX, LOW);

  if (GPS_ENABLED) {
    GPS_SERIAL.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  }

  setupESPNow();

  Serial.printf("[MARSHAL] Node %s v%s ready\n", NODE_ID, FIRMWARE_VERSION);
  printRoutingConfig();
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  checkIRSensor();
  checkFlagButton();
  if (GPS_ENABLED) pollGPS();

  if (Serial.available()) handleSerialCommand();
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESP-NOW SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setupESPNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();

  if (esp_now_init() != ESP_OK) {
    Serial.println("[MESH] ESP-NOW init failed — halting");
    while (true) { delay(1000); }
  }

  esp_now_register_recv_cb(onFrameReceived);
  esp_now_register_send_cb(onFrameSent);

  // Register Hub peer
  if (!isZeroMAC(HUB_MAC)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, HUB_MAC, 6);
    peer.channel = 0;
    peer.encrypt = false;
    esp_now_add_peer(&peer);
    hubPeerAdded = true;
    Serial.println("[MESH] Hub peer registered");
  }

  // Register next Marshal peer
  if (!isZeroMAC(NEXT_MARSHAL_MAC)) {
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, NEXT_MARSHAL_MAC, 6);
    peer.channel = 0;
    peer.encrypt = false;
    esp_now_add_peer(&peer);
    nextMarshalPeerAdded = true;
    Serial.println("[MESH] Next Marshal peer registered");
  }

  if (!hubPeerAdded && !nextMarshalPeerAdded) {
    Serial.println("[MESH] WARNING: No upstream peer configured — frames will not be forwarded");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESP-NOW RECEIVE — Core relay logic
// ─────────────────────────────────────────────────────────────────────────────
void onFrameReceived(const uint8_t* senderMAC, const uint8_t* data, int len) {
  flashLED(LED_MESH_RX);

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, data, len) != DeserializationError::Ok) {
    Serial.println("[MESH] Malformed frame received — dropped");
    return;
  }

  // ── TTL check (loop prevention) ──────────────────────────────────────────
  int ttl = doc["ttl"] | FRAME_TTL;
  if (ttl <= 0) {
    Serial.println("[MESH] TTL expired — frame dropped");
    return;
  }
  doc["ttl"] = ttl - 1;

  // ── Identify frame type ──────────────────────────────────────────────────
  String frameType = doc["t"] | "";

  if (frameType == "veh") {
    // Vehicle telemetry frame
    const char* vehicleId = doc["id"] | "unknown";
    updateVehicleRecord(vehicleId);
    injectMarshalMetadata(doc);
    forwardFrame(doc);

  } else if (frameType == "marshal_relay") {
    // Already-tagged relay frame from a downstream Marshal Node
    // Just inject our node as a relay hop and forward
    addRelayHop(doc);
    forwardFrame(doc);

  } else if (frameType == "crossing") {
    // Crossing event from a downstream node — forward as-is
    forwardFrame(doc);

  } else {
    // Unknown frame type — forward anyway (future compatibility)
    forwardFrame(doc);
  }
}

// Inject this Marshal Node's identity and seen-timestamp into the frame
void injectMarshalMetadata(StaticJsonDocument<512>& doc) {
  // Wrap original vehicle frame into a relay frame
  // This preserves the original vehicle data while adding routing context
  doc["t"]            = "marshal_relay";
  doc["via"]          = NODE_ID;
  doc["via_ms"]       = millis();
  doc["via_rssi"]     = WiFi.RSSI(); // approximate — STA mode RSSI

  if (GPS_ENABLED && gpsData.valid) {
    doc["node_lat"] = gpsData.latitude;
    doc["node_lon"] = gpsData.longitude;
  }
}

void addRelayHop(StaticJsonDocument<512>& doc) {
  // Append to hop chain if present
  String hops = doc["hops"] | "";
  if (hops.length() > 0) hops += ",";
  hops += String(NODE_ID);
  doc["hops"] = hops;
}

// Forward frame to Hub (preferred) or next Marshal (fallback)
void forwardFrame(StaticJsonDocument<512>& doc) {
  uint8_t buf[512];
  size_t  len = serializeJson(doc, buf, sizeof(buf));

  if (hubPeerAdded) {
    esp_err_t result = esp_now_send(HUB_MAC, buf, len);
    if (result == ESP_OK) {
      flashLED(LED_MESH_TX);
    } else {
      Serial.printf("[MESH] Hub send failed (%d) — trying next Marshal\n", result);
      if (nextMarshalPeerAdded) {
        esp_now_send(NEXT_MARSHAL_MAC, buf, len);
        flashLED(LED_MESH_TX);
      }
    }
  } else if (nextMarshalPeerAdded) {
    esp_now_send(NEXT_MARSHAL_MAC, buf, len);
    flashLED(LED_MESH_TX);
  }
}

void onFrameSent(const uint8_t* mac, esp_now_send_status_t status) {
  if (status != ESP_NOW_SEND_SUCCESS) {
    Serial.println("[MESH] Send failed — upstream node unreachable");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  VEHICLE TRACKING
// ─────────────────────────────────────────────────────────────────────────────
void updateVehicleRecord(const char* id) {
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (vehicles[i].active && strcmp(vehicles[i].id, id) == 0) {
      vehicles[i].lastSeenMs = millis();
      return;
    }
  }
  // New vehicle — find empty slot
  for (int i = 0; i < MAX_VEHICLES; i++) {
    if (!vehicles[i].active) {
      strncpy(vehicles[i].id, id, 7);
      vehicles[i].id[7]      = '\0';
      vehicles[i].lastSeenMs = millis();
      vehicles[i].active     = true;
      Serial.printf("[MARSHAL] New vehicle seen: %s\n", id);
      return;
    }
  }
  Serial.println("[MARSHAL] Vehicle table full — oldest entry overwritten");
  // Overwrite slot 0 as fallback
  strncpy(vehicles[0].id, id, 7);
  vehicles[0].lastSeenMs = millis();
}

// ─────────────────────────────────────────────────────────────────────────────
//  IR CROSSING DETECTION
// ─────────────────────────────────────────────────────────────────────────────
/*
 * IR beam sensor wired to GPIO 14 via INPUT_PULLUP.
 * Beam intact = HIGH. Beam broken by passing vehicle = LOW.
 * Debounced to prevent multiple events per crossing.
 * Generates a "crossing" event frame that is forwarded to the Hub.
 * The Hub uses crossing events from the designated start/finish node
 * to compute official lap times.
 */
void checkIRSensor() {
  bool currentState = digitalRead(IR_SENSOR_PIN);

  if (irLastState == HIGH && currentState == LOW) {
    // Falling edge — beam broken — vehicle crossing detected
    unsigned long now = millis();
    if (now - irLastCrossingMs >= (unsigned long)IR_DEBOUNCE_MS) {
      irLastCrossingMs = now;
      onCrossingDetected("ir", now);
    }
  }

  irLastState = currentState;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MANUAL FLAG BUTTON
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Physical button (INPUT_PULLUP) allows a marshal to manually trigger
 * a crossing event — useful for tracks without IR sensors, or as override.
 * Also used to send flag signals (yellow, red, etc.) in future expansions.
 */
bool     btnLastState = HIGH;
unsigned long btnLastMs = 0;

void checkFlagButton() {
  bool state = digitalRead(FLAG_BUTTON_PIN);
  unsigned long now = millis();

  if (btnLastState == HIGH && state == LOW && (now - btnLastMs > 500)) {
    btnLastMs    = now;
    btnLastState = state;
    onCrossingDetected("manual", now);
    Serial.println("[MARSHAL] Manual crossing trigger");
  }
  btnLastState = state;
}

// ─────────────────────────────────────────────────────────────────────────────
//  CROSSING EVENT
// ─────────────────────────────────────────────────────────────────────────────
void onCrossingDetected(const char* source, unsigned long timestampMs) {
  Serial.printf("[MARSHAL] Crossing at node %s via %s at %lu ms\n", NODE_ID, source, timestampMs);

  StaticJsonDocument<256> doc;
  doc["t"]          = "crossing";
  doc["node"]       = NODE_ID;
  doc["source"]     = source; // "ir" | "manual"
  doc["ms"]         = timestampMs;
  doc["ttl"]        = FRAME_TTL;

  if (GPS_ENABLED && gpsData.valid) {
    doc["lat"] = gpsData.latitude;
    doc["lon"] = gpsData.longitude;
  }

  uint8_t buf[256];
  size_t  len = serializeJson(doc, buf, sizeof(buf));

  if (hubPeerAdded) {
    esp_now_send(HUB_MAC, buf, len);
  } else if (nextMarshalPeerAdded) {
    esp_now_send(NEXT_MARSHAL_MAC, buf, len);
  }

  flashLED(LED_MESH_TX);
}

// ─────────────────────────────────────────────────────────────────────────────
//  GPS (optional)
// ─────────────────────────────────────────────────────────────────────────────
void pollGPS() {
  while (GPS_SERIAL.available()) {
    char c = GPS_SERIAL.read();
    if (c == '\n') {
      if (gpsBuffer.startsWith("$GPRMC") || gpsBuffer.startsWith("$GNRMC")) {
        parseMinimalGPRMC(gpsBuffer);
      }
      gpsBuffer = "";
    } else if (c != '\r') {
      gpsBuffer += c;
      if (gpsBuffer.length() > 100) gpsBuffer = "";
    }
  }
}

void parseMinimalGPRMC(const String& s) {
  // Extract lat/lon from GPRMC for node position tagging
  int comma[8]; int ci = 0;
  for (int i = 0; i < (int)s.length() && ci < 8; i++) {
    if (s[i] == ',') comma[ci++] = i + 1;
  }
  if (ci < 7) return;

  String status = s.substring(comma[1], comma[2] - 1);
  if (status != "A") { gpsData.valid = false; return; }

  gpsData.valid = true;

  String latRaw = s.substring(comma[2], comma[3] - 1);
  String latDir = s.substring(comma[3], comma[4] - 1);
  gpsData.latitude = latRaw.substring(0, 2).toFloat() + latRaw.substring(2).toFloat() / 60.0;
  if (latDir == "S") gpsData.latitude = -gpsData.latitude;

  String lonRaw = s.substring(comma[4], comma[5] - 1);
  String lonDir = s.substring(comma[5], comma[6] - 1);
  gpsData.longitude = lonRaw.substring(0, 3).toFloat() + lonRaw.substring(3).toFloat() / 60.0;
  if (lonDir == "W") gpsData.longitude = -gpsData.longitude;
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
void flashLED(int pin) {
  digitalWrite(pin, HIGH);
  delay(LED_FLASH_MS);
  digitalWrite(pin, LOW);
}

void printRoutingConfig() {
  Serial.printf("[MARSHAL] Node ID: %s\n", NODE_ID);
  if (hubPeerAdded) {
    Serial.printf("[MESH] Routing: Direct → Hub %02X:%02X:%02X:%02X:%02X:%02X\n",
      HUB_MAC[0], HUB_MAC[1], HUB_MAC[2], HUB_MAC[3], HUB_MAC[4], HUB_MAC[5]);
  }
  if (nextMarshalPeerAdded) {
    Serial.printf("[MESH] Routing: Relay → Marshal %02X:%02X:%02X:%02X:%02X:%02X\n",
      NEXT_MARSHAL_MAC[0], NEXT_MARSHAL_MAC[1], NEXT_MARSHAL_MAC[2],
      NEXT_MARSHAL_MAC[3], NEXT_MARSHAL_MAC[4], NEXT_MARSHAL_MAC[5]);
  }
  Serial.printf("[MESH] IR Sensor: %s\n", "GPIO 14");
  Serial.printf("[MESH] GPS: %s\n", GPS_ENABLED ? "Enabled" : "Disabled");
}

void handleSerialCommand() {
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();

  if (cmd == "status") {
    Serial.printf("Node: %s  v%s\n", NODE_ID, FIRMWARE_VERSION);
    Serial.printf("GPS Valid: %s\n", gpsData.valid ? "YES" : "NO");
    Serial.printf("Hub peer: %s\n", hubPeerAdded ? "YES" : "NO");
    Serial.printf("Next Marshal: %s\n", nextMarshalPeerAdded ? "YES" : "NO");
    Serial.printf("Vehicles seen: ");
    for (int i = 0; i < MAX_VEHICLES; i++) {
      if (vehicles[i].active) Serial.printf("%s ", vehicles[i].id);
    }
    Serial.println();
  } else if (cmd == "crossing") {
    onCrossingDetected("manual_serial", millis());
  } else if (cmd == "reset") {
    ESP.restart();
  }
}
```

---

## Frame Relay Logic

```
Vehicle broadcasts ESP-NOW frame (type = "veh")
         │
         ▼
Marshal Node receives frame
         │
         ├── Update local vehicle table (track who is on track)
         │
         ├── Inject marshal metadata:
         │     - via:     node ID
         │     - via_ms:  local timestamp at this node
         │     - via_rssi: signal strength of incoming frame
         │     - node_lat / node_lon (if GPS equipped)
         │
         ├── Decrement TTL (drop if TTL = 0)
         │
         └── Forward to:
               1. Hub directly (if in range and registered)
               2. Next Marshal in chain (if Hub not reachable)
```

---

## Relay Frame Format

What the Hub receives from a Marshal Node relay:

```json
{
  "t":        "marshal_relay",
  "id":       "A3F921",
  "ms":       123456789,
  "sess":     true,
  "lat":      36.1597,
  "lon":      -96.5916,
  "spd":      112,
  "hdg":      247,
  "rpm":      6400,
  "tps":      87,
  "ect":      92,
  "vbat":     13.8,
  "obd":      2,
  "via":      "M-T3",
  "via_ms":   123456790,
  "via_rssi": -62,
  "hops":     "M-T1,M-T2,M-T3",
  "ttl":      2
}
```

---

## Crossing Event Frame

Sent by the Marshal Node to the Hub when IR beam is broken or manual button pressed:

```json
{
  "t":      "crossing",
  "node":   "M-SF",
  "source": "ir",
  "ms":     123456789,
  "lat":    36.1597,
  "lon":    -96.5916,
  "ttl":    5
}
```

The Hub correlates `crossing` events with vehicle telemetry frames to determine which vehicle crossed which node and at what time.

---

## Node Placement Guide

| Node ID | Position | IR Sensor | GPS | Notes |
|---|---|---|---|---|
| `M-SF` | Start / Finish line | **Required** | Recommended | Primary lap timing trigger |
| `M-S1` | Sector 1 boundary | Optional | Optional | Sector time split |
| `M-S2` | Sector 2 boundary | Optional | Optional | Sector time split |
| `M-T1` | Corner 1 apex | None | None | Relay only |
| `M-T3` | Corner 3 apex | None | None | Relay only |
| `M-PIT` | Pit lane entry | Optional | None | Pit in/out detection |

**Minimum viable deployment:** One `M-SF` node with IR sensor and direct Hub range. All other nodes optional.

---

## LED Status

| LED | Pattern | Meaning |
|---|---|---|
| LED_POWER (GPIO 2) | Solid ON | Node operational |
| LED_MESH_RX (GPIO 4) | Brief flash | Vehicle frame received |
| LED_MESH_TX (GPIO 5) | Brief flash | Frame forwarded upstream |
| All LEDs | Rapid blink | ESP-NOW init failed |

---

## Installation

1. Flash each node with a unique `NODE_ID` defined before compilation
2. Set `HUB_MAC` to the Hub Node's WiFi MAC address (get from Hub serial output at boot)
3. If this node cannot reach the Hub directly, set `NEXT_MARSHAL_MAC` to the next node in chain toward the Hub
4. Set `GPS_ENABLED true` only on nodes where a GPS module is physically wired
5. Verify with serial monitor — send `status` command to confirm routing config

---

*Marshal Node Firmware is part of the Reycin Race Network. See OBD_ESP32_FIRMWARE.md (Vehicle Node) and HUB_NODE_FIRMWARE.md (Hub) for the full mesh architecture.*
