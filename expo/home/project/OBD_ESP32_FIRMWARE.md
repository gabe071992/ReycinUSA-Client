# Reycin Vehicle Node Firmware Specification

**Version:** 2.0.0  
**Device Role:** Vehicle-mounted OBD + GPS + Mesh Telemetry Node  
**Target Hardware:** ESP32-WROOM-32  
**Communication:** WebSocket (to mobile app) + ESP-NOW (to Marshal/Hub nodes)

---

## Overview

The Vehicle Node is the ESP32 unit physically installed on the vehicle. It serves three simultaneous roles:

1. **OBD Bridge** — Reads engine/ECU data via ELM327 and streams to the connected mobile app over WiFi WebSocket
2. **GPS Telemetry Source** — Reads GPS position via UART-connected GPS module and includes it in every telemetry frame
3. **Mesh Network Participant** — Broadcasts combined OBD+GPS telemetry to nearby Marshal Nodes (or directly to Hub if in range) via ESP-NOW

### Critical Design Rule — No-OBD Graceful Degradation

**The firmware must never block, halt, or reduce functionality because OBD data is unavailable.**  
This is a hard requirement for development and testing phases where the OBD harness may not be connected, or the development vehicle may not respond to specific PIDs.

Three distinct OBD states are tracked independently:

| State | Description | Behavior |
|---|---|---|
| `OBD_ABSENT` | No ELM327 detected on serial | GPS-only telemetry; all OBD fields omitted from frame |
| `OBD_CONNECTED_NO_DATA` | ELM327 present, vehicle not responding to PIDs | OBD fields sent as `null`; GPS continues normally |
| `OBD_CONNECTED_ACTIVE` | ELM327 present, vehicle responding | Full telemetry frame |

The mobile app and all downstream nodes must be designed to accept partial frames where any OBD field may be absent.

---

## Hardware Requirements

### Required
- ESP32-WROOM-32 (or ESP32-S3 equivalent)
- GPS Module — UART (NEO-6M, NEO-M8N, or equivalent at 9600 baud)
- 12V to 5V/3.3V buck converter
- OBD II J1962 connector

### Optional (OBD path)
- ELM327 or STN1110 OBD II chip (ISO 9141-2 K-Line interface)
- CAN Bus transceiver (MCP2515 or similar)

---

## Wiring Diagram

```
ESP32 Pin   | Component          | Description
------------|-------------------|---------------------------
GPIO 16     | ELM327 TX         | OBD serial RX to ESP32
GPIO 17     | ELM327 RX         | OBD serial TX from ESP32
GPIO 12     | GPS TX            | GPS serial RX to ESP32
GPIO 13     | GPS RX            | GPS serial TX from ESP32 (optional)
GPIO 5      | CAN CS            | CAN chip select (if using MCP2515)
GPIO 18     | CAN SCK           | SPI clock
GPIO 19     | CAN MISO          | SPI data in
GPIO 23     | CAN MOSI          | SPI data out
GPIO 2      | Status LED        | Connection indicator (onboard)
GPIO 4      | Mesh LED          | ESP-NOW activity indicator
3.3V        | Power Supply      | Logic power
GND         | Ground            | Common ground
```

---

## Complete Arduino Firmware (.ino)

```cpp
/*
 * Reycin USA — Vehicle Node Firmware
 * Version: 2.0.0
 * Roles: OBD Bridge + GPS Telemetry + ESP-NOW Mesh Participant
 *
 * IMPORTANT: OBD absence or non-response is handled gracefully.
 * The node continues GPS telemetry and mesh broadcasting regardless
 * of OBD status. This is required for dev/test environments.
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <EEPROM.h>
#include <esp_now.h>
#include <esp_wifi.h>

// ─── Firmware Identity ────────────────────────────────────────────────────────
#define FIRMWARE_VERSION     "2.0.0"
#define NODE_TYPE            "vehicle"
#define DEVICE_NAME          "Reycin_VEH_"
#define AP_PASSWORD          "reycin123"

// ─── Port / Pin Config ────────────────────────────────────────────────────────
#define WEBSOCKET_PORT       81
#define STATUS_LED           2
#define MESH_LED             4

// OBD serial (Serial2)
#define OBD_RX_PIN           16
#define OBD_TX_PIN           17
#define OBD_BAUD             38400
#define OBD_SERIAL           Serial2

// GPS serial (Serial1)
#define GPS_RX_PIN           12
#define GPS_TX_PIN           13
#define GPS_BAUD             9600
#define GPS_SERIAL           Serial1

// ─── Timing ──────────────────────────────────────────────────────────────────
int obdPollIntervalMs = 100;         // 10Hz default — runtime adjustable via set_poll_rate
#define GPS_POLL_INTERVAL_MS 250   // 4Hz GPS
#define MESH_TX_INTERVAL_MS  200   // 5Hz mesh broadcast
#define OBD_INIT_TIMEOUT_MS  5000  // Give up OBD init after 5s
#define OBD_PID_TIMEOUT_MS   500   // Per-PID timeout — never block longer
#define EEPROM_SIZE          512

// ─── OBD State Machine ───────────────────────────────────────────────────────
typedef enum {
  OBD_ABSENT,               // ELM327 not detected
  OBD_CONNECTED_NO_DATA,    // ELM327 present, vehicle not responding
  OBD_CONNECTED_ACTIVE      // Full OBD communication active
} OBDState;

OBDState obdState = OBD_ABSENT;

// ─── GPS State ───────────────────────────────────────────────────────────────
struct GPSData {
  bool    valid;
  float   latitude;
  float   longitude;
  float   altitude_m;
  float   speed_kmh;
  float   heading_deg;
  uint8_t satellites;
  char    utc_time[12]; // "HHMMSS.ss"
};

GPSData gpsData = { false, 0, 0, 0, 0, 0, 0, "" };

// ─── OBD Telemetry ───────────────────────────────────────────────────────────
struct TelemetryData {
  bool    rpm_valid;      int   rpm;
  bool    ect_valid;      int   ect_c;
  bool    iat_valid;      int   iat_c;
  bool    map_valid;      int   map_kpa;
  bool    vbat_valid;     float vbat;
  bool    tps_valid;      int   throttle_pct;
  bool    load_valid;     int   engine_load;
  bool    stft_valid;     float stft;
  bool    ltft_valid;     float ltft;
  bool    o2_valid;       float o2_voltage;
  String  dtc_codes[10];
  int     dtc_count;
};

TelemetryData telemetry = {};

// ─── PID Definitions ─────────────────────────────────────────────────────────
struct PIDDef {
  const char* code;
  const char* name;
  int         bytes;
  float       (*converter)(const String&);
  bool*       validFlag;
};

float cvtRPM(const String& d)      { if (d.length()<4) return 0; return ((strtol(d.substring(0,2).c_str(),NULL,16)*256)+strtol(d.substring(2,4).c_str(),NULL,16))/4.0; }
float cvtTemp(const String& d)     { if (d.length()<2) return 0; return strtol(d.substring(0,2).c_str(),NULL,16)-40; }
float cvtPct(const String& d)      { if (d.length()<2) return 0; return strtol(d.substring(0,2).c_str(),NULL,16)*100.0/255.0; }
float cvtVolt(const String& d)     { if (d.length()<4) return 0; return ((strtol(d.substring(0,2).c_str(),NULL,16)*256)+strtol(d.substring(2,4).c_str(),NULL,16))/1000.0; }
float cvtMAP(const String& d)      { if (d.length()<2) return 0; return strtol(d.substring(0,2).c_str(),NULL,16); }
float cvtFuelTrim(const String& d) { if (d.length()<2) return 0; return ((strtol(d.substring(0,2).c_str(),NULL,16)-128)*100.0)/128.0; }

PIDDef pids[] = {
  { "010C", "RPM",         2, cvtRPM,      &telemetry.rpm_valid  },
  { "0105", "ECT",         1, cvtTemp,     &telemetry.ect_valid  },
  { "010F", "IAT",         1, cvtTemp,     &telemetry.iat_valid  },
  { "010B", "MAP",         1, cvtMAP,      &telemetry.map_valid  },
  { "0142", "VBAT",        2, cvtVolt,     &telemetry.vbat_valid },
  { "0111", "THROTTLE",    1, cvtPct,      &telemetry.tps_valid  },
  { "0104", "ENGINE_LOAD", 1, cvtPct,      &telemetry.load_valid },
  { "0106", "STFT",        1, cvtFuelTrim, &telemetry.stft_valid },
  { "0107", "LTFT",        1, cvtFuelTrim, &telemetry.ltft_valid },
  { "0114", "O2_VOLTAGE",  1, cvtVolt,     &telemetry.o2_valid   },
};
const int pidCount = sizeof(pids) / sizeof(pids[0]);
int currentPidIndex = 0;

// ─── Phone GPS Fallback ───────────────────────────────────────────────────────
// Declared here (before buildTelemetryDoc) so it is in scope when building frames.
struct PhoneGPSData {
  bool    valid;
  float   latitude;
  float   longitude;
  float   altitude_m;
  float   speed_kmh;
  float   heading_deg;
  unsigned long receivedAt;
};
PhoneGPSData phoneGps = { false, 0, 0, 0, 0, 0, 0 };

#define PHONE_GPS_STALE_MS 3000

bool phoneGpsValid() {
  return phoneGps.valid && (millis() - phoneGps.receivedAt < PHONE_GPS_STALE_MS);
}

bool resolvedGpsValid()  { return gpsData.valid || phoneGpsValid(); }
float resolvedLat()      { return gpsData.valid ? gpsData.latitude    : phoneGps.latitude;    }
float resolvedLon()      { return gpsData.valid ? gpsData.longitude   : phoneGps.longitude;   }
float resolvedAlt()      { return gpsData.valid ? gpsData.altitude_m  : phoneGps.altitude_m;  }
float resolvedSpeed()    { return gpsData.valid ? gpsData.speed_kmh   : phoneGps.speed_kmh;   }
float resolvedHeading()  { return gpsData.valid ? gpsData.heading_deg : phoneGps.heading_deg; }

// ─── Connectivity ─────────────────────────────────────────────────────────────
WebSocketsServer webSocket = WebSocketsServer(WEBSOCKET_PORT);
bool             clientConnected = false;
unsigned long    lastOBDPoll     = 0;
unsigned long    lastGPSPoll     = 0;
unsigned long    lastMeshTx      = 0;

// ─── ESP-NOW ─────────────────────────────────────────────────────────────────
// Broadcast MAC — all Marshal/Hub nodes in range receive
uint8_t broadcastMAC[] = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };

esp_now_peer_info_t broadcastPeer = {};

// ─── Lap Timing (local reference) ────────────────────────────────────────────
// The vehicle node does NOT compute lap times — that is the Hub's responsibility.
// It does broadcast a session_active flag so Marshal nodes know a timed run is live.
bool sessionActive = false;

// ─────────────────────────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);

  pinMode(STATUS_LED, OUTPUT);
  pinMode(MESH_LED,   OUTPUT);
  digitalWrite(STATUS_LED, LOW);
  digitalWrite(MESH_LED,   LOW);

  GPS_SERIAL.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  OBD_SERIAL.begin(OBD_BAUD, SERIAL_8N1, OBD_RX_PIN, OBD_TX_PIN);

  setupWiFiAP();
  setupESPNow();

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  // Attempt OBD init — NEVER block if it fails
  initOBDNonBlocking();

  Serial.printf("[VEH] Reycin Vehicle Node v%s ready\n", FIRMWARE_VERSION);
  Serial.printf("[VEH] OBD State: %s\n", obdStateStr());
}

// ─────────────────────────────────────────────────────────────────────────────
//  LOOP
// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  webSocket.loop();

  unsigned long now = millis();

  // GPS poll — always runs regardless of OBD state
  if (now - lastGPSPoll >= GPS_POLL_INTERVAL_MS) {
    pollGPS();
    lastGPSPoll = now;
  }

  // OBD poll — only if state is ACTIVE or CONNECTED_NO_DATA (to keep probing)
  if (obdState != OBD_ABSENT && now - lastOBDPoll >= (unsigned long)obdPollIntervalMs) {
    pollOBDData();
    lastOBDPoll = now;
  } else if (obdState == OBD_ABSENT && clientConnected && now - lastOBDPoll >= 500UL) {
    // When OBD is absent, still push GPS-only telemetry frames at 2Hz so the
    // app receives position data during dev/test and phone GPS fallback works.
    sendTelemetryToApp();
    lastOBDPoll = now;
  }

  // Mesh broadcast — always runs; sends whatever data is available
  if (now - lastMeshTx >= MESH_TX_INTERVAL_MS) {
    broadcastMeshTelemetry();
    lastMeshTx = now;
  }

  updateStatusLED();

  if (Serial.available()) {
    handleSerialCommand();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  WIFI + ESP-NOW SETUP
// ─────────────────────────────────────────────────────────────────────────────
void setupWiFiAP() {
  String ssid = String(DEVICE_NAME) + getDeviceID();
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid.c_str(), AP_PASSWORD);
  Serial.printf("[VEH] AP: %s  IP: %s\n", ssid.c_str(), WiFi.softAPIP().toString().c_str());
}

void setupESPNow() {
  if (esp_now_init() != ESP_OK) {
    Serial.println("[MESH] ESP-NOW init failed");
    return;
  }
  memcpy(broadcastPeer.peer_addr, broadcastMAC, 6);
  broadcastPeer.channel = 0;
  broadcastPeer.encrypt  = false;
  esp_now_add_peer(&broadcastPeer);
  esp_now_register_send_cb(onMeshSent);
  Serial.println("[MESH] ESP-NOW initialized (broadcast)");
}

void onMeshSent(const uint8_t* mac, esp_now_send_status_t status) {
  // Non-blocking callback — flash LED only
  if (status == ESP_NOW_SEND_SUCCESS) {
    digitalWrite(MESH_LED, HIGH);
    delay(5);
    digitalWrite(MESH_LED, LOW);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  OBD INIT — NON-BLOCKING
// ─────────────────────────────────────────────────────────────────────────────
/*
 * Attempts to initialize ELM327. If the chip does not respond within
 * OBD_INIT_TIMEOUT_MS, sets obdState = OBD_ABSENT and returns immediately.
 * The firmware continues all other functions normally.
 */
void initOBDNonBlocking() {
  Serial.println("[OBD] Attempting init...");

  // Clear any serial garbage
  while (OBD_SERIAL.available()) OBD_SERIAL.read();

  // Attempt reset with timeout
  OBD_SERIAL.println("ATZ");
  if (!waitForOBDPrompt(OBD_INIT_TIMEOUT_MS)) {
    Serial.println("[OBD] ELM327 not detected — OBD_ABSENT");
    obdState = OBD_ABSENT;
    return;
  }

  sendOBDCmd("ATE0"); delay(100);
  sendOBDCmd("ATL0"); delay(100);
  sendOBDCmd("ATS0"); delay(100);
  sendOBDCmd("ATH0"); delay(100);
  sendOBDCmd("ATSP0"); delay(200);

  // Probe vehicle with RPM PID
  String resp = sendOBDCmdWithResponse("010C", OBD_PID_TIMEOUT_MS);
  if (resp.indexOf("41") >= 0) {
    obdState = OBD_CONNECTED_ACTIVE;
    Serial.println("[OBD] Vehicle responding — OBD_CONNECTED_ACTIVE");
  } else {
    obdState = OBD_CONNECTED_NO_DATA;
    Serial.println("[OBD] ELM327 present, vehicle silent — OBD_CONNECTED_NO_DATA");
  }
}

bool waitForOBDPrompt(unsigned long timeoutMs) {
  unsigned long deadline = millis() + timeoutMs;
  String buf = "";
  while (millis() < deadline) {
    while (OBD_SERIAL.available()) {
      char c = OBD_SERIAL.read();
      buf += c;
      if (c == '>') return true;
    }
  }
  return false;
}

void sendOBDCmd(const char* cmd) {
  OBD_SERIAL.println(cmd);
  waitForOBDPrompt(500);
}

String sendOBDCmdWithResponse(const char* cmd, unsigned long timeoutMs) {
  while (OBD_SERIAL.available()) OBD_SERIAL.read(); // flush
  OBD_SERIAL.println(cmd);

  unsigned long deadline = millis() + timeoutMs;
  String response = "";
  while (millis() < deadline) {
    while (OBD_SERIAL.available()) {
      char c = OBD_SERIAL.read();
      if (c == '>') return response;
      if (c != '\r' && c != '\n') response += c;
    }
  }
  return response; // timed out — return whatever we have (may be empty)
}

// ─────────────────────────────────────────────────────────────────────────────
//  OBD POLLING
// ─────────────────────────────────────────────────────────────────────────────
void pollOBDData() {
  PIDDef& pid = pids[currentPidIndex];

  String resp = sendOBDCmdWithResponse(pid.code, OBD_PID_TIMEOUT_MS);

  if (resp.length() > 0) {
    resp.replace(" ", "");
    if (resp.indexOf("41") == 0) {
      // Valid response
      String data = resp.substring(4);
      float val   = pid.converter(data);
      *(pid.validFlag) = true;

      // Update telemetry struct
      updateTelemetryField(pid.name, val);

      // If we were in NO_DATA state, upgrade to ACTIVE
      if (obdState == OBD_CONNECTED_NO_DATA) {
        obdState = OBD_CONNECTED_ACTIVE;
        Serial.println("[OBD] Vehicle now responding — upgraded to OBD_CONNECTED_ACTIVE");
      }
    } else {
      // Response received but not a valid PID response
      // Mark this PID as invalid but do NOT change overall OBD state
      *(pid.validFlag) = false;
    }
  } else {
    // Timeout on this specific PID — mark invalid, do not block
    *(pid.validFlag) = false;

    // If we were ACTIVE and multiple PIDs are failing, check if we've lost contact
    if (obdState == OBD_CONNECTED_ACTIVE) {
      checkOBDHealthDegradation();
    }
  }

  currentPidIndex = (currentPidIndex + 1) % pidCount;

  // Push to WebSocket app client after each full cycle
  if (currentPidIndex == 0 && clientConnected) {
    sendTelemetryToApp();
  }
}

void updateTelemetryField(const char* name, float val) {
  String n = String(name);
  if (n == "RPM")         telemetry.rpm          = (int)val;
  else if (n == "ECT")    telemetry.ect_c        = (int)val;
  else if (n == "IAT")    telemetry.iat_c        = (int)val;
  else if (n == "MAP")    telemetry.map_kpa      = (int)val;
  else if (n == "VBAT")   telemetry.vbat         = val;
  else if (n == "THROTTLE")    telemetry.throttle_pct = (int)val;
  else if (n == "ENGINE_LOAD") telemetry.engine_load  = (int)val;
  else if (n == "STFT")   telemetry.stft         = val;
  else if (n == "LTFT")   telemetry.ltft         = val;
  else if (n == "O2_VOLTAGE") telemetry.o2_voltage = val;
}

// Track how many consecutive full cycles have zero valid PIDs
int zeroValidCycles = 0;
void checkOBDHealthDegradation() {
  int validCount = 0;
  if (telemetry.rpm_valid)  validCount++;
  if (telemetry.ect_valid)  validCount++;
  if (telemetry.tps_valid)  validCount++;
  if (telemetry.vbat_valid) validCount++;

  if (validCount == 0) {
    zeroValidCycles++;
    if (zeroValidCycles >= 5) {
      obdState = OBD_CONNECTED_NO_DATA;
      zeroValidCycles = 0;
      Serial.println("[OBD] Lost vehicle response — downgraded to OBD_CONNECTED_NO_DATA");
    }
  } else {
    zeroValidCycles = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  GPS POLLING — NMEA PARSER (GPRMC / GPGGA)
// ─────────────────────────────────────────────────────────────────────────────
String gpsBuffer = "";

void pollGPS() {
  while (GPS_SERIAL.available()) {
    char c = GPS_SERIAL.read();
    if (c == '\n') {
      parseNMEA(gpsBuffer);
      gpsBuffer = "";
    } else if (c != '\r') {
      gpsBuffer += c;
      if (gpsBuffer.length() > 120) gpsBuffer = ""; // overflow guard
    }
  }
}

// Minimal NMEA parser — GPRMC (position + speed + heading) and GPGGA (altitude + sats)
void parseNMEA(const String& sentence) {
  if (sentence.startsWith("$GPRMC") || sentence.startsWith("$GNRMC")) {
    parseGPRMC(sentence);
  } else if (sentence.startsWith("$GPGGA") || sentence.startsWith("$GNGGA")) {
    parseGPGGA(sentence);
  }
}

// GPRMC: $GPRMC,HHMMSS,A,LLLL.LL,N,YYYYY.YY,E,knots,heading,DDMMYY,...
void parseGPRMC(const String& s) {
  int fields[12];
  int idx = 0;
  fields[idx++] = 0;
  for (int i = 0; i < (int)s.length() && idx < 12; i++) {
    if (s[i] == ',') fields[idx++] = i + 1;
  }
  if (idx < 7) return;

  String status = s.substring(fields[1], fields[2] - 1);
  if (status != "A") { gpsData.valid = false; return; }

  gpsData.valid     = true;
  String utc        = s.substring(fields[0] + 7, fields[1] - 1);
  utc.toCharArray(gpsData.utc_time, sizeof(gpsData.utc_time));

  // Latitude
  String latRaw  = s.substring(fields[2], fields[3] - 1);
  String latDir  = s.substring(fields[3], fields[4] - 1);
  float  latDeg  = latRaw.substring(0, 2).toFloat();
  float  latMin  = latRaw.substring(2).toFloat();
  gpsData.latitude = latDeg + latMin / 60.0;
  if (latDir == "S") gpsData.latitude = -gpsData.latitude;

  // Longitude
  String lonRaw  = s.substring(fields[4], fields[5] - 1);
  String lonDir  = s.substring(fields[5], fields[6] - 1);
  float  lonDeg  = lonRaw.substring(0, 3).toFloat();
  float  lonMin  = lonRaw.substring(3).toFloat();
  gpsData.longitude = lonDeg + lonMin / 60.0;
  if (lonDir == "W") gpsData.longitude = -gpsData.longitude;

  // Speed (knots → km/h)
  gpsData.speed_kmh  = s.substring(fields[6], fields[7] - 1).toFloat() * 1.852;
  // Heading
  gpsData.heading_deg = s.substring(fields[7], fields[8] - 1).toFloat();
}

// GPGGA: $GPGGA,HHMMSS,lat,N,lon,E,fix,sats,hdop,altitude,M,...
void parseGPGGA(const String& s) {
  int fields[15];
  int idx = 0;
  fields[idx++] = 0;
  for (int i = 0; i < (int)s.length() && idx < 15; i++) {
    if (s[i] == ',') fields[idx++] = i + 1;
  }
  if (idx < 10) return;

  gpsData.satellites = s.substring(fields[6], fields[7] - 1).toInt();
  gpsData.altitude_m  = s.substring(fields[8], fields[9] - 1).toFloat();
}

// ─────────────────────────────────────────────────────────────────────────────
//  TELEMETRY FRAMES
// ─────────────────────────────────────────────────────────────────────────────

// Build the canonical telemetry JSON document
// OBD fields are only included when their valid flag is true.
// GPS fields are only included when gpsData.valid is true.
// This allows the app and Hub to distinguish "sensor offline" from "sensor = 0".
void buildTelemetryDoc(JsonDocument& doc) {
  doc["type"]        = "telemetry";
  doc["node_type"]   = NODE_TYPE;
  doc["device_id"]   = getDeviceID();
  doc["obd_state"]   = obdStateStr();
  doc["session"]     = sessionActive;
  doc["timestamp"]   = millis();

  // GPS block — hardware GPS first, phone GPS fallback if hardware absent/invalid
  if (gpsData.valid) {
    JsonObject gps    = doc["gps"].to<JsonObject>();
    gps["lat"]        = gpsData.latitude;
    gps["lon"]        = gpsData.longitude;
    gps["alt_m"]      = gpsData.altitude_m;
    gps["speed_kmh"]  = gpsData.speed_kmh;
    gps["heading"]    = gpsData.heading_deg;
    gps["sats"]       = gpsData.satellites;
    gps["utc"]        = gpsData.utc_time;
    gps["src"]        = "esp32";
  } else if (phoneGpsValid()) {
    JsonObject gps    = doc["gps"].to<JsonObject>();
    gps["lat"]        = phoneGps.latitude;
    gps["lon"]        = phoneGps.longitude;
    gps["alt_m"]      = phoneGps.altitude_m;
    gps["speed_kmh"]  = phoneGps.speed_kmh;
    gps["heading"]    = phoneGps.heading_deg;
    gps["sats"]       = 0;
    gps["src"]        = "phone";
  }

  // OBD block — only include fields that are currently valid
  if (obdState == OBD_CONNECTED_ACTIVE) {
    JsonObject obd = doc["obd"].to<JsonObject>();
    if (telemetry.rpm_valid)  obd["rpm"]          = telemetry.rpm;
    if (telemetry.ect_valid)  obd["ect_c"]        = telemetry.ect_c;
    if (telemetry.iat_valid)  obd["iat_c"]        = telemetry.iat_c;
    if (telemetry.map_valid)  obd["map_kpa"]      = telemetry.map_kpa;
    if (telemetry.vbat_valid) obd["vbat"]         = telemetry.vbat;
    if (telemetry.tps_valid)  obd["throttle_pct"] = telemetry.throttle_pct;
    if (telemetry.load_valid) obd["engine_load"]  = telemetry.engine_load;
    if (telemetry.stft_valid) obd["stft"]         = telemetry.stft;
    if (telemetry.ltft_valid) obd["ltft"]         = telemetry.ltft;
    if (telemetry.o2_valid)   obd["o2_voltage"]   = telemetry.o2_voltage;
  }
}

// Send full telemetry to connected mobile app (WebSocket).
// Also called when OBD is absent but GPS is available so the app receives position data.
void sendTelemetryToApp() {
  if (!clientConnected) return;
  JsonDocument doc;
  buildTelemetryDoc(doc);
  String json;
  serializeJson(doc, json);
  webSocket.broadcastTXT(json);
}

// Broadcast compact frame to mesh network via ESP-NOW
// Kept under 250 bytes (ESP-NOW payload limit)
void broadcastMeshTelemetry() {
  JsonDocument doc;
  doc["t"]    = "veh";
  doc["id"]   = getDeviceID();
  doc["ms"]   = millis();
  doc["sess"] = sessionActive;

  // Use resolved GPS (hardware preferred, phone fallback)
  if (resolvedGpsValid()) {
    doc["lat"]  = resolvedLat();
    doc["lon"]  = resolvedLon();
    doc["spd"]  = (int)resolvedSpeed();
    doc["hdg"]  = (int)resolvedHeading();
    doc["gsrc"] = gpsData.valid ? 0 : 1; // 0=ESP32, 1=phone
  }

  if (obdState == OBD_CONNECTED_ACTIVE) {
    if (telemetry.rpm_valid)  doc["rpm"]  = telemetry.rpm;
    if (telemetry.tps_valid)  doc["tps"]  = telemetry.throttle_pct;
    if (telemetry.ect_valid)  doc["ect"]  = telemetry.ect_c;
    if (telemetry.vbat_valid) doc["vbat"] = telemetry.vbat;
  }

  doc["obd"] = (uint8_t)obdState;

  uint8_t buf[250];
  size_t  len = serializeJson(doc, buf, sizeof(buf));
  esp_now_send(broadcastMAC, buf, len);
}

// ─────────────────────────────────────────────────────────────────────────────
//  WEBSOCKET — APP INTERFACE
// ─────────────────────────────────────────────────────────────────────────────
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client %u disconnected\n", num);
      clientConnected = false;
      break;

    case WStype_CONNECTED: {
      Serial.printf("[WS] Client %u connected\n", num);
      clientConnected = true;

      JsonDocument doc;
      doc["type"]        = "connected";
      doc["version"]     = FIRMWARE_VERSION;
      doc["node_type"]   = NODE_TYPE;
      doc["device_id"]   = getDeviceID();
      doc["obd_state"]   = obdStateStr();
      doc["gps_present"] = true; // GPS hardware always present on this node

      String json;
      serializeJson(doc, json);
      webSocket.sendTXT(num, json);
      break;
    }

    case WStype_TEXT: {
      String msg = String((char*)payload);
      handleAppCommand(num, msg);
      break;
    }
  }
}

void handleAppCommand(uint8_t num, const String& message) {
  JsonDocument doc;
  if (deserializeJson(doc, message) != DeserializationError::Ok) return;

  String cmd = doc["command"] | "";

  if (cmd == "get_dtc") {
    getDTCCodes(num);
  } else if (cmd == "clear_dtc") {
    clearDTCCodes(num);
  } else if (cmd == "set_poll_rate") {
    int rate = doc["rate"] | 10;
    if (rate >= 1 && rate <= 20) {
      obdPollIntervalMs = 1000 / rate;
    }
  } else if (cmd == "actuate") {
    String control = doc["control"] | "";
    bool   state   = doc["state"]   | false;
    actuateControl(num, control, state);
  } else if (cmd == "raw_obd") {
    String rawCmd = doc["cmd"] | "";
    if (rawCmd.length() > 0) sendRawToApp(num, rawCmd);
  } else if (cmd == "start_session") {
    sessionActive = true;
    replyOK(num, "session_started");
  } else if (cmd == "stop_session") {
    sessionActive = false;
    replyOK(num, "session_stopped");
  } else if (cmd == "get_status") {
    sendStatusToApp(num);
  } else if (cmd == "gps_update") {
    // Phone GPS fallback — used when hardware GPS module is absent or has no fix
    phoneGps.latitude    = doc["lat"]       | 0.0f;
    phoneGps.longitude   = doc["lon"]       | 0.0f;
    phoneGps.altitude_m  = doc["alt_m"]     | 0.0f;
    phoneGps.speed_kmh   = doc["speed_kmh"] | 0.0f;
    phoneGps.heading_deg = doc["heading"]   | 0.0f;
    phoneGps.valid       = (phoneGps.latitude != 0.0f || phoneGps.longitude != 0.0f);
    phoneGps.receivedAt  = millis();
    // No reply needed — fire-and-forget from app
  }
}

void replyOK(uint8_t num, const char* event) {
  JsonDocument doc;
  doc["type"]    = event;
  doc["success"] = true;
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

void sendStatusToApp(uint8_t num) {
  JsonDocument doc;
  doc["type"]       = "status";
  doc["version"]    = FIRMWARE_VERSION;
  doc["device_id"]  = getDeviceID();
  doc["obd_state"]  = obdStateStr();
  doc["gps_valid"]  = gpsData.valid;
  doc["gps_sats"]   = gpsData.satellites;
  doc["session"]    = sessionActive;
  doc["uptime_ms"]  = millis();
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

// ─────────────────────────────────────────────────────────────────────────────
//  OBD COMMANDS (App-facing)
// ─────────────────────────────────────────────────────────────────────────────
void getDTCCodes(uint8_t num) {
  JsonDocument doc;
  doc["type"] = "dtc_codes";
  JsonArray codes = doc["codes"].to<JsonArray>();

  if (obdState == OBD_ABSENT) {
    doc["error"] = "OBD not connected";
  } else {
    String resp = sendOBDCmdWithResponse("03", 2000);
    resp.replace(" ", "");
    if (resp.indexOf("43") == 0) {
      for (int i = 2; i < (int)resp.length(); i += 4) {
        if (i + 3 < (int)resp.length()) {
          String code = parseDTCCode(resp.substring(i, i + 4));
          if (code != "P0000") codes.add(code);
        }
      }
    }
  }

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

void clearDTCCodes(uint8_t num) {
  JsonDocument doc;
  doc["type"] = "dtc_cleared";
  if (obdState == OBD_ABSENT) {
    doc["success"] = false;
    doc["error"]   = "OBD not connected";
  } else {
    sendOBDCmdWithResponse("04", 2000);
    doc["success"] = true;
  }
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

void actuateControl(uint8_t num, const String& control, bool state) {
  JsonDocument doc;
  doc["type"]    = "actuate_result";
  doc["control"] = control;
  doc["state"]   = state;

  if (obdState == OBD_ABSENT) {
    doc["success"] = false;
    doc["error"]   = "OBD not connected";
  } else {
    String obdCmd = "";
    if (control == "fan_main")  obdCmd = state ? "0801" : "0800";
    else if (control == "pump_aux") obdCmd = state ? "0803" : "0802";

    if (obdCmd.length() > 0) {
      sendOBDCmdWithResponse(obdCmd.c_str(), 1000);
      doc["success"] = true;
    } else {
      doc["success"] = false;
      doc["error"]   = "Unknown control";
    }
  }

  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

void sendRawToApp(uint8_t num, const String& cmd) {
  String resp = sendOBDCmdWithResponse(cmd.c_str(), 2000);
  JsonDocument doc;
  doc["type"]     = "raw_response";
  doc["command"]  = cmd;
  doc["response"] = (obdState == OBD_ABSENT) ? "ERROR: OBD ABSENT" : resp;
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

// ─────────────────────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
String getDeviceID() {
  char id[7];
  sprintf(id, "%06X", (uint32_t)ESP.getEfuseMac());
  return String(id);
}

const char* obdStateStr() {
  switch (obdState) {
    case OBD_ABSENT:             return "absent";
    case OBD_CONNECTED_NO_DATA:  return "no_data";
    case OBD_CONNECTED_ACTIVE:   return "active";
  }
  return "unknown";
}

String parseDTCCode(const String& hex) {
  if (hex.length() != 4) return "P0000";
  int b1 = strtol(hex.substring(0, 2).c_str(), NULL, 16);
  int b2 = strtol(hex.substring(2, 4).c_str(), NULL, 16);
  String prefix;
  switch ((b1 >> 6) & 0x03) {
    case 0: prefix = "P"; break;
    case 1: prefix = "C"; break;
    case 2: prefix = "B"; break;
    default: prefix = "U"; break;
  }
  char code[6];
  sprintf(code, "%s%01X%03X", prefix.c_str(), (b1 >> 4) & 0x03, ((b1 & 0x0F) << 8) | b2);
  return String(code);
}

void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool          ledState  = false;

  if (clientConnected && obdState == OBD_CONNECTED_ACTIVE) {
    digitalWrite(STATUS_LED, HIGH);
  } else if (clientConnected || obdState == OBD_CONNECTED_NO_DATA) {
    if (millis() - lastBlink > 500) { ledState = !ledState; digitalWrite(STATUS_LED, ledState); lastBlink = millis(); }
  } else {
    if (millis() - lastBlink > 150) { ledState = !ledState; digitalWrite(STATUS_LED, ledState); lastBlink = millis(); }
  }
}

void handleSerialCommand() {
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if      (cmd == "status")   { printStatus(); }
  else if (cmd == "reset")    { ESP.restart(); }
  else if (cmd == "obdinit")  { initOBDNonBlocking(); }
  else if (cmd.startsWith("obd ")) {
    String resp = sendOBDCmdWithResponse(cmd.substring(4).c_str(), 2000);
    Serial.printf("[OBD] > %s\n", resp.c_str());
  }
}

void printStatus() {
  Serial.println("=== Reycin Vehicle Node Status ===");
  Serial.printf("Firmware:    v%s\n", FIRMWARE_VERSION);
  Serial.printf("Device ID:   %s\n", getDeviceID().c_str());
  Serial.printf("OBD State:   %s\n", obdStateStr());
  Serial.printf("GPS Valid:   %s  Sats: %d\n", gpsData.valid ? "YES" : "NO", gpsData.satellites);
  Serial.printf("Client:      %s\n", clientConnected ? "Connected" : "None");
  Serial.printf("Session:     %s\n", sessionActive ? "Active" : "Idle");
  Serial.printf("Uptime:      %lu ms\n", millis());
  Serial.println("===================================");
}
```

---

## OBD State Reference

| State | `obd_state` field | OBD fields in frame | Typical cause |
|---|---|---|---|
| `OBD_ABSENT` | `"absent"` | Not present | No ELM327 wired, dev bench testing |
| `OBD_CONNECTED_NO_DATA` | `"no_data"` | All `null` / omitted | ELM327 connected, ignition off, or dev vehicle with no ECU |
| `OBD_CONNECTED_ACTIVE` | `"active"` | Present per valid flag | Normal race operation |

**The mobile app and Hub must accept all three states without error.**  
The digital dash should display sensors as "offline" (gray) when their valid flag is absent from the frame, rather than showing zero or crashing.

---

## Telemetry Frame Reference

### Full Frame (GPS + OBD Active)
```json
{
  "type": "telemetry",
  "node_type": "vehicle",
  "device_id": "A3F921",
  "obd_state": "active",
  "session": true,
  "timestamp": 123456789,
  "gps": {
    "lat": 36.1597,
    "lon": -96.5916,
    "alt_m": 284.5,
    "speed_kmh": 112.3,
    "heading": 247.0,
    "sats": 9,
    "utc": "143022.00"
  },
  "obd": {
    "rpm": 6400,
    "ect_c": 92,
    "iat_c": 38,
    "map_kpa": 97,
    "vbat": 13.8,
    "throttle_pct": 87,
    "engine_load": 91,
    "stft": -1.2,
    "ltft": 2.3,
    "o2_voltage": 0.72
  }
}
```

### GPS-Only Frame (OBD Absent — Dev Mode)
```json
{
  "type": "telemetry",
  "node_type": "vehicle",
  "device_id": "A3F921",
  "obd_state": "absent",
  "session": false,
  "timestamp": 123456789,
  "gps": {
    "lat": 36.1597,
    "lon": -96.5916,
    "alt_m": 284.5,
    "speed_kmh": 0.0,
    "heading": 0.0,
    "sats": 6,
    "utc": "143022.00"
  }
}
```

### OBD Connected, No ECU Response (Dev / Ignition Off)
```json
{
  "type": "telemetry",
  "node_type": "vehicle",
  "device_id": "A3F921",
  "obd_state": "no_data",
  "session": false,
  "timestamp": 123456789,
  "gps": { "lat": 36.1597, "lon": -96.5916, ... }
}
```

---

## ESP-NOW Mesh Compact Frame (< 250 bytes)

```json
{
  "t":    "veh",
  "id":   "A3F921",
  "ms":   123456789,
  "sess": true,
  "lat":  36.1597,
  "lon":  -96.5916,
  "spd":  112,
  "hdg":  247,
  "rpm":  6400,
  "tps":  87,
  "ect":  92,
  "vbat": 13.8,
  "obd":  2
}
```

`obd` field: `0` = absent, `1` = no_data, `2` = active

---

## App Commands (WebSocket)

| Command | Payload | Description |
|---|---|---|
| `get_dtc` | — | Read stored fault codes |
| `clear_dtc` | — | Clear DTCs (double-confirm in app required) |
| `set_poll_rate` | `{ "rate": 10 }` | Set OBD polling rate 1–20 Hz |
| `actuate` | `{ "control": "fan_main", "state": true }` | Actuator override |
| `raw_obd` | `{ "cmd": "010C" }` | Direct ELM327 command |
| `start_session` | — | Mark session active (broadcast to mesh) |
| `stop_session` | — | Mark session inactive |
| `get_status` | — | Full node status response |
| `gps_update` | `{ "lat": 36.1, "lon": -96.5, "speed_kmh": 80.0, "heading": 247.0, "alt_m": 284.0 }` | Phone GPS fallback — sent by app when hardware GPS is absent or has no fix |

### Phone GPS Fallback — Architecture

The vehicle node connects to **exactly one** phone app via WebSocket. When the hardware GPS module (NEO-6M etc.) is absent or has not acquired a fix, the app detects the missing `gps` block in telemetry frames and begins sending its own device GPS via `gps_update` commands at 1Hz.

**Fallback Priority:**
1. Hardware GPS (NEO-6M / NEO-M8N via UART) — always preferred
2. Phone device GPS (`gps_update` from connected app) — automatic fallback
3. No GPS — `gps` block omitted from all telemetry frames

Phone GPS data is treated as stale after `PHONE_GPS_STALE_MS` (3000ms) without a new update, preventing stale position from propagating through the mesh.

The `gsrc` field in mesh compact frames indicates the GPS source: `0` = hardware, `1` = phone.

---

## LED Status

| Pattern | Meaning |
|---|---|
| Solid ON (STATUS_LED) | App connected + OBD active |
| Slow blink 500ms (STATUS_LED) | App connected OR OBD no_data |
| Fast blink 150ms (STATUS_LED) | No app, no OBD |
| Brief flash (MESH_LED) | ESP-NOW frame sent successfully |

---

## Installation

1. Install libraries: `WebSockets` (Markus Sattler), `ArduinoJson` (Benoit Blanchon), `TinyGPS++` (optional, can use built-in NMEA parser above)
2. Board: ESP32 Dev Module, 240MHz, QIO, 4MB default partition
3. GPS baud: 9600 (most NEO-6M default) — change `GPS_BAUD` if different
4. OBD baud: 38400 — try 9600 or 115200 if ELM327 variant differs

---

*Vehicle Node Firmware is part of the Reycin Race Network. See MARSHAL_NODE_FIRMWARE.md and HUB_NODE_FIRMWARE.md for the full mesh architecture.*
