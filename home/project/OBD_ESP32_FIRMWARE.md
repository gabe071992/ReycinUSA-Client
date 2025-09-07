# OBD II ESP32 Firmware Specification

## Overview
This document provides the complete Arduino (.ino) firmware for the ESP32-based OBD II adapter that communicates with the Reycin USA mobile application.

## Hardware Requirements
- ESP32 DevKit (ESP32-WROOM-32)
- ELM327 or STN1110 OBD II chip
- ISO 9141-2 K-Line interface
- CAN Bus transceiver (MCP2515 or similar)
- 12V to 3.3V/5V power regulator
- OBD II connector (J1962)

## Wiring Diagram
```
ESP32 Pin   | OBD Component      | Description
------------|-------------------|------------------
GPIO 16     | ELM327 TX         | Serial communication
GPIO 17     | ELM327 RX         | Serial communication
GPIO 5      | CAN CS            | CAN chip select
GPIO 18     | CAN SCK           | SPI clock
GPIO 19     | CAN MISO          | SPI data in
GPIO 23     | CAN MOSI          | SPI data out
GPIO 2      | Status LED        | Connection indicator
3.3V        | Power Supply      | Logic power
GND         | Ground            | Common ground
```

## Complete Arduino Firmware (.ino)

```cpp
/*
 * Reycin USA OBD II ESP32 Firmware
 * Version: 1.0.0
 * Compatible with Reycin USA Mobile App
 * 
 * This firmware creates a WebSocket server that the mobile app connects to
 * for real-time OBD II data streaming.
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <EEPROM.h>

// Configuration
#define FIRMWARE_VERSION "1.0.0"
#define DEVICE_NAME "Reycin_OBD_"
#define AP_PASSWORD "reycin123"
#define WEBSOCKET_PORT 81
#define OBD_SERIAL Serial2
#define OBD_BAUD 38400
#define STATUS_LED 2
#define EEPROM_SIZE 512

// OBD Serial Pins
#define OBD_RX_PIN 16
#define OBD_TX_PIN 17

// WebSocket server
WebSocketsServer webSocket = WebSocketsServer(WEBSOCKET_PORT);

// Connection state
bool obdConnected = false;
bool clientConnected = false;
unsigned long lastPollTime = 0;
unsigned long pollInterval = 100; // 10Hz default

// Telemetry data structure
struct TelemetryData {
  int rpm;
  int ect_c;
  int iat_c;
  int map_kpa;
  float vbat;
  int throttle_pct;
  int engine_load;
  float stft;
  float ltft;
  float o2_voltage;
  String fuel_status;
  String dtc_codes[10];
  int dtc_count;
};

TelemetryData telemetry;

// PID definitions
struct PID {
  String code;
  String name;
  int bytes;
  float (*converter)(String);
};

// PID converters
float convertRPM(String data) {
  if (data.length() >= 4) {
    int a = strtol(data.substring(0, 2).c_str(), NULL, 16);
    int b = strtol(data.substring(2, 4).c_str(), NULL, 16);
    return ((a * 256) + b) / 4.0;
  }
  return 0;
}

float convertTemp(String data) {
  if (data.length() >= 2) {
    int a = strtol(data.substring(0, 2).c_str(), NULL, 16);
    return a - 40;
  }
  return 0;
}

float convertPercent(String data) {
  if (data.length() >= 2) {
    int a = strtol(data.substring(0, 2).c_str(), NULL, 16);
    return (a * 100.0) / 255.0;
  }
  return 0;
}

float convertVoltage(String data) {
  if (data.length() >= 2) {
    int a = strtol(data.substring(0, 2).c_str(), NULL, 16);
    return a / 200.0;
  }
  return 0;
}

float convertMAP(String data) {
  if (data.length() >= 2) {
    int a = strtol(data.substring(0, 2).c_str(), NULL, 16);
    return a;
  }
  return 0;
}

float convertFuelTrim(String data) {
  if (data.length() >= 2) {
    int a = strtol(data.substring(0, 2).c_str(), NULL, 16);
    return ((a - 128) * 100.0) / 128.0;
  }
  return 0;
}

// PID list
PID pids[] = {
  {"010C", "RPM", 2, convertRPM},
  {"0105", "ECT", 1, convertTemp},
  {"010F", "IAT", 1, convertTemp},
  {"010B", "MAP", 1, convertMAP},
  {"0142", "VBAT", 2, convertVoltage},
  {"0111", "THROTTLE", 1, convertPercent},
  {"0104", "ENGINE_LOAD", 1, convertPercent},
  {"0106", "STFT", 1, convertFuelTrim},
  {"0107", "LTFT", 1, convertFuelTrim},
  {"0114", "O2_VOLTAGE", 1, convertVoltage}
};

const int pidCount = sizeof(pids) / sizeof(pids[0]);
int currentPidIndex = 0;

void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);
  
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);
  
  // Initialize OBD serial
  OBD_SERIAL.begin(OBD_BAUD, SERIAL_8N1, OBD_RX_PIN, OBD_TX_PIN);
  
  // Setup WiFi AP
  setupWiFiAP();
  
  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  // Initialize OBD
  initializeOBD();
  
  Serial.println("Reycin OBD II Adapter Ready");
  Serial.print("Connect to WiFi: ");
  Serial.println(String(DEVICE_NAME) + getDeviceID());
  Serial.print("WebSocket Port: ");
  Serial.println(WEBSOCKET_PORT);
}

void loop() {
  webSocket.loop();
  
  // Poll OBD data if connected
  if (obdConnected && clientConnected) {
    unsigned long currentTime = millis();
    if (currentTime - lastPollTime >= pollInterval) {
      pollOBDData();
      lastPollTime = currentTime;
    }
  }
  
  // Update status LED
  updateStatusLED();
  
  // Handle serial commands for debugging
  if (Serial.available()) {
    handleSerialCommand();
  }
}

void setupWiFiAP() {
  String ssid = String(DEVICE_NAME) + getDeviceID();
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid.c_str(), AP_PASSWORD);
  
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
}

String getDeviceID() {
  uint64_t chipid = ESP.getEfuseMac();
  char id[7];
  sprintf(id, "%06X", (uint32_t)chipid);
  return String(id);
}

void initializeOBD() {
  Serial.println("Initializing OBD connection...");
  
  // Reset ELM327
  sendOBDCommand("ATZ");
  delay(2000);
  
  // Echo off
  sendOBDCommand("ATE0");
  delay(200);
  
  // Line feeds off
  sendOBDCommand("ATL0");
  delay(200);
  
  // Spaces off
  sendOBDCommand("ATS0");
  delay(200);
  
  // Headers off
  sendOBDCommand("ATH0");
  delay(200);
  
  // Set protocol to auto
  sendOBDCommand("ATSP0");
  delay(200);
  
  // Test connection with RPM request
  String response = sendOBDCommand("010C");
  if (response.indexOf("41 0C") != -1) {
    obdConnected = true;
    Serial.println("OBD connected successfully");
  } else {
    obdConnected = false;
    Serial.println("OBD connection failed");
  }
}

String sendOBDCommand(String cmd) {
  OBD_SERIAL.println(cmd);
  
  unsigned long timeout = millis() + 1000;
  String response = "";
  
  while (millis() < timeout) {
    if (OBD_SERIAL.available()) {
      char c = OBD_SERIAL.read();
      if (c == '>') {
        break;
      }
      if (c != '\r' && c != '\n') {
        response += c;
      }
    }
  }
  
  return response;
}

void pollOBDData() {
  // Poll current PID
  PID currentPid = pids[currentPidIndex];
  String response = sendOBDCommand(currentPid.code);
  
  // Parse response
  if (response.length() > 0) {
    parseOBDResponse(currentPid, response);
  }
  
  // Move to next PID
  currentPidIndex = (currentPidIndex + 1) % pidCount;
  
  // Send telemetry every complete cycle
  if (currentPidIndex == 0) {
    sendTelemetry();
  }
}

void parseOBDResponse(PID pid, String response) {
  // Remove spaces and get data portion
  response.replace(" ", "");
  
  // Check for valid response (41 = mode 01 response)
  if (response.indexOf("41") == 0) {
    String data = response.substring(4); // Skip "41XX" where XX is PID
    
    if (pid.code == "010C") {
      telemetry.rpm = (int)pid.converter(data);
    } else if (pid.code == "0105") {
      telemetry.ect_c = (int)pid.converter(data);
    } else if (pid.code == "010F") {
      telemetry.iat_c = (int)pid.converter(data);
    } else if (pid.code == "010B") {
      telemetry.map_kpa = (int)pid.converter(data);
    } else if (pid.code == "0142") {
      telemetry.vbat = pid.converter(data);
    } else if (pid.code == "0111") {
      telemetry.throttle_pct = (int)pid.converter(data);
    } else if (pid.code == "0104") {
      telemetry.engine_load = (int)pid.converter(data);
    } else if (pid.code == "0106") {
      telemetry.stft = pid.converter(data);
    } else if (pid.code == "0107") {
      telemetry.ltft = pid.converter(data);
    } else if (pid.code == "0114") {
      telemetry.o2_voltage = pid.converter(data);
    }
  }
}

void sendTelemetry() {
  if (!clientConnected) return;
  
  StaticJsonDocument<512> doc;
  doc["type"] = "telemetry";
  doc["rpm"] = telemetry.rpm;
  doc["ect_c"] = telemetry.ect_c;
  doc["iat_c"] = telemetry.iat_c;
  doc["map_kpa"] = telemetry.map_kpa;
  doc["vbat"] = telemetry.vbat;
  doc["throttle_pct"] = telemetry.throttle_pct;
  doc["engine_load"] = telemetry.engine_load;
  doc["stft"] = telemetry.stft;
  doc["ltft"] = telemetry.ltft;
  doc["o2_voltage"] = telemetry.o2_voltage;
  doc["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  webSocket.broadcastTXT(json);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      clientConnected = false;
      break;
      
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
        clientConnected = true;
        
        // Send connection confirmation
        StaticJsonDocument<256> doc;
        doc["type"] = "connected";
        doc["version"] = FIRMWARE_VERSION;
        doc["device_id"] = getDeviceID();
        
        String json;
        serializeJson(doc, json);
        webSocket.sendTXT(num, json);
      }
      break;
      
    case WStype_TEXT:
      {
        String message = String((char*)payload);
        handleWebSocketMessage(num, message);
      }
      break;
  }
}

void handleWebSocketMessage(uint8_t num, String message) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }
  
  String command = doc["command"];
  
  if (command == "get_dtc") {
    getDTCCodes(num);
  } else if (command == "clear_dtc") {
    clearDTCCodes(num);
  } else if (command == "set_poll_rate") {
    int rate = doc["rate"];
    setPollRate(rate);
  } else if (command == "actuate") {
    String control = doc["control"];
    bool state = doc["state"];
    actuateControl(control, state);
  } else if (command == "raw_obd") {
    String cmd = doc["cmd"];
    sendRawOBDCommand(num, cmd);
  }
}

void getDTCCodes(uint8_t num) {
  String response = sendOBDCommand("03");
  
  StaticJsonDocument<512> doc;
  doc["type"] = "dtc_codes";
  
  JsonArray codes = doc.createNestedArray("codes");
  
  // Parse DTC codes from response
  if (response.indexOf("43") == 0) {
    // Parse trouble codes
    // Format: 43 XX XX XX XX XX XX
    // Each pair of XX represents a DTC
    response.replace(" ", "");
    for (int i = 2; i < response.length(); i += 4) {
      if (i + 3 < response.length()) {
        String code = parseDTCCode(response.substring(i, i + 4));
        if (code != "P0000") {
          codes.add(code);
        }
      }
    }
  }
  
  telemetry.dtc_count = codes.size();
  
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

String parseDTCCode(String hex) {
  if (hex.length() != 4) return "P0000";
  
  int byte1 = strtol(hex.substring(0, 2).c_str(), NULL, 16);
  int byte2 = strtol(hex.substring(2, 4).c_str(), NULL, 16);
  
  String prefix;
  switch ((byte1 >> 6) & 0x03) {
    case 0: prefix = "P"; break;
    case 1: prefix = "C"; break;
    case 2: prefix = "B"; break;
    case 3: prefix = "U"; break;
  }
  
  char code[6];
  sprintf(code, "%s%01X%03X", prefix.c_str(), (byte1 >> 4) & 0x03, ((byte1 & 0x0F) << 8) | byte2);
  
  return String(code);
}

void clearDTCCodes(uint8_t num) {
  sendOBDCommand("04");
  
  StaticJsonDocument<128> doc;
  doc["type"] = "dtc_cleared";
  doc["success"] = true;
  
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

void setPollRate(int rate) {
  if (rate >= 1 && rate <= 20) {
    pollInterval = 1000 / rate;
    Serial.printf("Poll rate set to %d Hz\n", rate);
  }
}

void actuateControl(String control, bool state) {
  // Mode 08 - Request control of on-board system
  // This is vehicle-specific and should be implemented based on your ECU
  
  if (control == "fan_main") {
    // Example: Control main cooling fan
    String cmd = state ? "0801" : "0800";
    sendOBDCommand(cmd);
  } else if (control == "pump_aux") {
    // Example: Control auxiliary pump
    String cmd = state ? "0803" : "0802";
    sendOBDCommand(cmd);
  }
  // Add more controls as needed
}

void sendRawOBDCommand(uint8_t num, String cmd) {
  String response = sendOBDCommand(cmd);
  
  StaticJsonDocument<256> doc;
  doc["type"] = "raw_response";
  doc["command"] = cmd;
  doc["response"] = response;
  
  String json;
  serializeJson(doc, json);
  webSocket.sendTXT(num, json);
}

void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  if (clientConnected && obdConnected) {
    // Solid on when fully connected
    digitalWrite(STATUS_LED, HIGH);
  } else if (obdConnected) {
    // Slow blink when OBD connected but no client
    if (millis() - lastBlink > 1000) {
      ledState = !ledState;
      digitalWrite(STATUS_LED, ledState);
      lastBlink = millis();
    }
  } else {
    // Fast blink when not connected to OBD
    if (millis() - lastBlink > 200) {
      ledState = !ledState;
      digitalWrite(STATUS_LED, ledState);
      lastBlink = millis();
    }
  }
}

void handleSerialCommand() {
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  
  if (cmd == "status") {
    printStatus();
  } else if (cmd == "reset") {
    ESP.restart();
  } else if (cmd.startsWith("obd ")) {
    String obdCmd = cmd.substring(4);
    String response = sendOBDCommand(obdCmd);
    Serial.print("OBD Response: ");
    Serial.println(response);
  }
}

void printStatus() {
  Serial.println("=== Reycin OBD Status ===");
  Serial.print("Firmware Version: ");
  Serial.println(FIRMWARE_VERSION);
  Serial.print("Device ID: ");
  Serial.println(getDeviceID());
  Serial.print("OBD Connected: ");
  Serial.println(obdConnected ? "Yes" : "No");
  Serial.print("Client Connected: ");
  Serial.println(clientConnected ? "Yes" : "No");
  Serial.print("Poll Rate: ");
  Serial.print(1000 / pollInterval);
  Serial.println(" Hz");
  Serial.print("WiFi SSID: ");
  Serial.println(String(DEVICE_NAME) + getDeviceID());
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());
  Serial.println("========================");
}
```

## Installation Instructions

1. **Install Required Libraries**
   - Open Arduino IDE
   - Go to Tools > Manage Libraries
   - Install the following:
     - `WebSockets` by Markus Sattler
     - `ArduinoJson` by Benoit Blanchon

2. **Board Configuration**
   - Go to Tools > Board > ESP32 Arduino > ESP32 Dev Module
   - Set the following parameters:
     - Upload Speed: 921600
     - CPU Frequency: 240MHz (WiFi/BT)
     - Flash Frequency: 80MHz
     - Flash Mode: QIO
     - Flash Size: 4MB (32Mb)
     - Partition Scheme: Default 4MB with spiffs

3. **Upload the Firmware**
   - Connect ESP32 to computer via USB
   - Select the correct COM port in Tools > Port
   - Click Upload button

## Mobile App Integration

The mobile app connects to the ESP32 via WebSocket using the following format:

### Connection
```javascript
// In the OBDProvider
const ws = new WebSocket(`ws://192.168.4.1:81`);
```

### Message Format

**Request telemetry:**
```json
{
  "command": "get_telemetry"
}
```

**Response:**
```json
{
  "type": "telemetry",
  "rpm": 3200,
  "ect_c": 85,
  "iat_c": 28,
  "map_kpa": 98,
  "vbat": 13.8,
  "throttle_pct": 45,
  "engine_load": 62,
  "stft": -2.3,
  "ltft": 1.5,
  "o2_voltage": 0.45,
  "timestamp": 123456789
}
```

**Get DTC codes:**
```json
{
  "command": "get_dtc"
}
```

**Clear DTC codes:**
```json
{
  "command": "clear_dtc"
}
```

**Set polling rate:**
```json
{
  "command": "set_poll_rate",
  "rate": 10
}
```

**Actuate control:**
```json
{
  "command": "actuate",
  "control": "fan_main",
  "state": true
}
```

## LED Status Indicators

- **Solid ON**: Fully connected (OBD + Mobile App)
- **Slow Blink (1Hz)**: OBD connected, waiting for app
- **Fast Blink (5Hz)**: No OBD connection
- **OFF**: No power or initialization

## Troubleshooting

1. **OBD Not Connecting**
   - Verify ELM327 wiring
   - Check vehicle ignition is ON
   - Try different baud rates (9600, 38400, 115200)

2. **App Can't Connect**
   - Ensure connected to ESP32 WiFi network
   - Check WebSocket port (81) is correct
   - Verify IP address (192.168.4.1)

3. **No Data Received**
   - Check vehicle compatibility
   - Verify PIDs are supported by vehicle
   - Monitor serial output for errors

## Supported OBD Protocols

- ISO 15765-4 (CAN)
- ISO 14230-4 (KWP2000)
- ISO 9141-2
- J1850 VPW
- J1850 PWM

## Security Notes

- Change default AP password in production
- Implement authentication for WebSocket connections
- Use encrypted connections (WSS) for production
- Validate all incoming commands
- Implement rate limiting for commands

## License

This firmware is proprietary to Reycin USA and should only be used with authorized Reycin OBD devices and applications.