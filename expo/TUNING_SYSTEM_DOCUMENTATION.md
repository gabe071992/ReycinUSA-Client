# Reycin Tuning Console — System Documentation

**Version:** 2.0.0  
**Platform:** Reycin USA Mobile App  
**Firmware Target:** Reycin OBD II ESP32 v2.0.0  
**Vehicle Target:** Reycin F300 / GTR250R Engine Configuration  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Connection Architecture](#2-connection-architecture)
3. [GPS System](#3-gps-system)
4. [OBD State Machine](#4-obd-state-machine)
5. [Mesh Network & Hub Architecture](#5-mesh-network--hub-architecture)
6. [Sensor Inventory](#6-sensor-inventory)
7. [Required Sensors — Base Operation](#7-required-sensors--base-operation)
8. [Required Sensors — Performance Operation](#8-required-sensors--performance-operation)
9. [Optional Sensors — Extended Suite](#9-optional-sensors--extended-suite)
10. [Actuator Controls](#10-actuator-controls)
11. [Fuel System Analysis](#11-fuel-system-analysis)
12. [Thermal Management](#12-thermal-management)
13. [Diagnostics & Fault Codes](#13-diagnostics--fault-codes)
14. [Raw OBD Console](#14-raw-obd-console)
15. [Poll Rate Configuration](#15-poll-rate-configuration)
16. [GTR250R Engine Notes](#16-gtr250r-engine-notes)
17. [Expansion & Future Sensors](#17-expansion--future-sensors)
18. [OBD Mode Reference](#18-obd-mode-reference)
19. [Safety Protocols & Data Logging](#19-safety-protocols--data-logging)

---

## 1. System Overview

The Reycin Tuning Console is a granular, real-time vehicle parameter monitoring and control interface built into the Race tab of the Reycin USA mobile application. It communicates with the vehicle's onboard ECU through the Reycin OBD II ESP32 adapter via WebSocket over a local WiFi access point hosted by the ESP32.

### Architecture Summary

```
Reycin Mobile App
      │
      │  WebSocket (ws://192.168.4.1:81)
      │  JSON command/response protocol
      │
ESP32-WROOM-32 (Reycin VEH Node)
      │
      │  UART Serial (38400 baud) — OBD II
      │  UART Serial1           — GPS Module (NEO-6M / NEO-M8N)
      │
ELM327 / STN1110 OBD II Chip        GPS Module
      │                                    │
      │  OBD II Protocols                  │  NMEA at 9600 baud
      │  (CAN, KWP2000, ISO 9141-2, J1850) │
      │                                    │
Vehicle ECU                         Position / Speed / Heading
```

### Command Protocol (v2.0.0)

All commands are JSON objects. The `command` field is the primary dispatcher.

**From App → ESP32:**

| Command | Fields | Purpose |
|---|---|---|
| `get_dtc` | — | Trigger Mode 03 DTC scan |
| `clear_dtc` | — | Mode 04 DTC clear + MIL reset |
| `set_poll_rate` | `rate` (int, 1–20) | Set OBD poll rate in Hz |
| `actuate` | `control` (string), `state` (bool) | Actuator override |
| `raw_obd` | `cmd` (string) | Pass-through raw OBD command to ELM327 |
| `gps_update` | `lat`, `lon`, `speed_kmh`, `heading`, `alt_m` | Phone GPS fallback injection |
| `start_session` | — | Mark session active for mesh broadcast |
| `stop_session` | — | Mark session inactive |
| `get_status` | — | Request full node status response |

```json
{ "command": "get_dtc" }
{ "command": "set_poll_rate", "rate": 10 }
{ "command": "actuate", "control": "fan_main", "state": true }
{ "command": "gps_update", "lat": 37.4219, "lon": -122.0840, "speed_kmh": 62.1, "heading": 270, "alt_m": 15 }
{ "command": "start_session" }
{ "command": "get_status" }
```

**From ESP32 → App (Telemetry push — v2.0.0 nested frame format):**

```json
{
  "type": "telemetry",
  "node_type": "vehicle",
  "device_id": "A3F921",
  "obd_state": "active",
  "session": true,
  "timestamp": 123456789,
  "gps": {
    "lat": 37.4219,
    "lon": -122.0840,
    "speed_kmh": 62.1,
    "heading": 270,
    "alt_m": 15,
    "sats": 8,
    "utc": "12:34:05",
    "src": "esp32"
  },
  "obd": {
    "rpm": 3200,
    "ect_c": 85,
    "iat_c": 28,
    "map_kpa": 98,
    "vbat": 13.8,
    "throttle_pct": 45,
    "engine_load": 62,
    "stft": -2.3,
    "ltft": 1.5,
    "o2_voltage": 0.45
  }
}
```

> **App compatibility note:** `OBDProvider.tsx` reads OBD fields from `msg.obd ?? msg`. If `msg.obd` is present (v2.0.0+), the nested block is used. If absent, the parser falls back to flat top-level fields (legacy v1.0.0 firmware). Both formats are supported simultaneously.

**From ESP32 → App (Connection confirmed):**
```json
{
  "type": "connected",
  "version": "2.0.0",
  "gps_present": true,
  "obd_state": "active"
}
```

**From ESP32 → App (Status response to `get_status`):**
```json
{
  "type": "status",
  "obd_state": "active",
  "gps_valid": true,
  "gps_sats": 8,
  "session": false
}
```

---

## 2. Connection Architecture

| Parameter | Value |
|---|---|
| Transport | WebSocket |
| Address | `ws://192.168.4.1:81` |
| WiFi SSID | `Reycin_VEH_XXXXXX` (device-specific suffix from MAC) |
| WiFi Password | `reycin123` (change in production) |
| Protocol | JSON over WebSocket text frames |
| Auto-reconnect | 3 second retry |

> **Note:** The SSID prefix is `Reycin_VEH_`, not `Reycin_OBD_`. This changed in v2.0.0 when the device role was renamed from OBD adapter to Vehicle Node to reflect the expanded GPS + mesh capability.

### Connection States

| State | Description |
|---|---|
| `disconnected` | No active WebSocket session |
| `connecting` | WebSocket handshake in progress |
| `connected` | Active session — telemetry and status frames flowing |
| `error` | Connection failed; reconnect scheduled in 3 seconds |

### Connection Sequence

1. App calls `connect("wifi")` → opens WebSocket to `ws://192.168.4.1:81`
2. On `onopen`, app immediately sends `{ command: "get_status" }` (500ms delay)
3. Firmware responds with `type: "status"` carrying `obd_state` and `gps_valid`
4. Firmware begins pushing `type: "telemetry"` frames at the configured poll rate
5. App starts phone GPS watcher in parallel (see Section 3)

---

## 3. GPS System

### Hardware GPS (Primary Source)

The Vehicle Node firmware v2.0.0 supports a hardware GPS module (NEO-6M or NEO-M8N) connected via UART Serial1. When a valid fix is obtained:

- GPS data is included in every telemetry frame under the `gps{}` nested object
- `gps.src` is `"esp32"`
- The Digital Dash displays an `ESP32` GPS source badge

**GPS object fields:**

| Field | Type | Description |
|---|---|---|
| `lat` | float | Latitude (decimal degrees, WGS84) |
| `lon` | float | Longitude (decimal degrees, WGS84) |
| `speed_kmh` | float | Speed over ground in km/h |
| `heading` | float | True heading in degrees (0–360) |
| `alt_m` | float | Altitude in metres |
| `sats` | int | Number of satellites used in fix |
| `utc` | string | UTC time string from GPS `GPRMC` sentence |
| `src` | string | `"esp32"` or `"phone"` |

### Phone GPS Fallback

When the hardware GPS module is absent or has no fix, the app activates its own GPS using `expo-location`:

1. `OBDProvider` calls `Location.watchPositionAsync` with `BestForNavigation` accuracy at 1 second / 2 metre intervals immediately on WebSocket connection
2. On each phone GPS update, the app sends a `gps_update` command to the firmware, injecting the phone coordinates into the Vehicle Node's internal GPS state
3. The firmware includes the injected position in all subsequent mesh broadcasts with `gps_src: "phone"`
4. The `gps{}` object in telemetry frames then carries `src: "phone"`
5. The Digital Dash displays a `PHONE` GPS source badge
6. `OBDProvider` tracks source in `gpsSource` state: `"esp32"` | `"phone"` | `null`

### GPS When OBD is Absent

When `obd_state == "absent"`, the firmware does not call `sendTelemetryToApp()`, so no WebSocket frames are pushed to the app. The phone GPS watcher continues running independently — `OBDProvider` reads `phoneLocationRef.current` directly rather than waiting for a telemetry frame. GPS position therefore remains available on the Digital Dash even with no OBD connection.

> **Firmware improvement pending:** The Vehicle Node should be updated to push GPS-only telemetry frames (with `obd` block omitted) even when `obd_state == "absent"`, to allow real-time position relay through the mesh when the ELM327 is not connected.

---

## 4. OBD State Machine

Firmware v2.0.0 introduces a three-state OBD detection machine. The state is reported on every telemetry frame and status response in the `obd_state` field.

| State | `obd_state` value | Meaning |
|---|---|---|
| `OBD_ABSENT` | `"absent"` | ELM327 not detected on UART. OBD fields are omitted entirely from telemetry. Firmware does not call `sendTelemetryToApp()`. |
| `OBD_CONNECTED_NO_DATA` | `"no_data"` | ELM327 detected, but vehicle not responding to PID queries. OBD fields present but may be zero. |
| `OBD_CONNECTED_ACTIVE` | `"active"` | Full OBD telemetry flowing. All configured PIDs responding. |

### App Behavior Per State

| State | Tuning Console | Digital Dash |
|---|---|---|
| `absent` | Badge: `OBD ABSENT` — sensor values show `—` | OBD fields blank; GPS may still show if phone GPS active |
| `no_data` | Badge: `NO DATA` — sensor values show `—` | OBD fields blank |
| `active` | Normal live values | Full telemetry display |

### Hub Behavior Per State

The Hub Node (`HUB_NODE_FIRMWARE.md`) tracks `obdState` per vehicle in `VehicleState`. When pushing telemetry to PIT Manager clients via `pushTelemetryToPIT()`, OBD fields are only included when `obdState == 2` (`OBD_CONNECTED_ACTIVE`). GPS fields are always included regardless of OBD state.

---

## 5. Mesh Network & Hub Architecture

The Vehicle Node does not communicate directly with the PIT Manager app. During a race session, all vehicle telemetry flows through the ESP-NOW mesh to the Hub Node, which then serves it to connected apps over WebSocket.

### Network Topology

```
Vehicle Node (ws://192.168.4.1:81)
      │  ESP-NOW broadcast
      ▼
Marshal Node(s)
      │  ESP-NOW relay
      ▼
Hub Node (WiFi AP)
      │  ws://192.168.5.1:82
      ├── Driver App  (role: "driver")   — Phone mounted in car
      └── PIT Manager (role: "pit")      — Tablet in pit lane
```

### Hub Node Connection (PITProvider / Driver App)

The Driver app connects to the Hub Node via `PITProvider.tsx`:

- **Default URL:** `ws://192.168.4.2:82` (configurable in Race tab connection screen)
- **Port:** 82 (distinct from the Vehicle Node port 81)
- **Auto-reconnect:** 4 second retry on disconnect

**Role Registration Handshake (required — Hub v2.0.0):**

On WebSocket open, the client must immediately send a registration frame:
```json
{ "type": "register", "role": "driver" }
```
The Hub stores the role and routes messages accordingly. Messages sent before registration is complete will be rejected. The PIT Manager app sends `{ "type": "register", "role": "pit" }`.

> If registration is skipped or the wrong `type` is used, the Hub logs `"unknown type"` and the client receives no routed messages. This was the cause of a live protocol mismatch in pre-v2.0.0 app builds where `"driver_ready"` was sent instead of `"register"` — corrected in app v2.0.0.

### Compact Mesh Frame Format

Vehicle Nodes broadcast telemetry over ESP-NOW using a compact JSON format constrained to 250 bytes (ESP-NOW frame limit). Field names are abbreviated:

| Short Key | Full Meaning | Type |
|---|---|---|
| `t` | Frame type (`"v"` = vehicle) | string |
| `id` | Device ID (MAC suffix) | string |
| `ms` | Uptime milliseconds | uint32 |
| `sess` | Session active flag | bool |
| `lat` | Latitude | float |
| `lon` | Longitude | float |
| `spd` | Speed km/h | float |
| `hdg` | Heading degrees | float |
| `gsrc` | GPS source (`"esp32"` / `"phone"`) | string |
| `rpm` | Engine RPM | int |
| `tps` | Throttle position % | int |
| `ect` | Coolant temp °C | int |
| `vbat` | Battery voltage V | float |
| `obd` | OBD state code (0=absent, 1=no_data, 2=active) | int |

The Hub unpacks these short keys back into full `VehicleState` fields before distributing to PIT clients.

---

## 6. Sensor Inventory

### Tier Classification

| Tier | Label | Description |
|---|---|---|
| `base` | BASE | Core sensors required for safe vehicle operation at all times |
| `performance` | PERF | Sensors required for engine management and performance monitoring |
| `expanded` | EXT | Optional extended sensors — user can toggle per installed hardware |

### Status Classification

| Status | Color | Meaning |
|---|---|---|
| `normal` | Green `#34C759` | Value within normal operating range |
| `warning` | Yellow `#FFD600` | Value approaching limit — monitor closely |
| `critical` | Red `#FF1801` | Value outside safe range — immediate attention |
| `offline` | Gray `#333` | Sensor not connected, disabled, or `obd_state != "active"` |

---

## 7. Required Sensors — Base Operation

These sensors are **always active** and cannot be disabled. They represent the minimum sensor suite for safe vehicle operation.

---

### 7.1 RPM — Engine Speed

| Property | Value |
|---|---|
| PID | `010C` |
| OBD Mode | Mode 01 (live data) |
| Response Bytes | 2 |
| Formula | `((A × 256) + B) / 4` |
| Unit | rpm |
| Tier | BASE — Required |

**Operating Ranges:**

| Range | Min | Max | Action |
|---|---|---|---|
| Idle | 750 | 1200 | Normal |
| Normal Operation | 800 | 7000 | Normal |
| Warning | 7000 | 8500 | Monitor — approaching redline |
| Critical / Redline | 8500 | 9800 | Immediate throttle lift |

**Notes:**
- The GTR250R engine (recommended) has a 9800 rpm redline
- The shift light system on the Digital Dash activates at 65% RPM (warning zone entry)
- RPM is the primary input for gear estimation on the Digital Dash

---

### 7.2 ECT — Engine Coolant Temperature

| Property | Value |
|---|---|
| PID | `0105` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `A - 40` |
| Unit | °C |
| Tier | BASE — Required |

**Operating Ranges:**

| Range | Min | Max | Action |
|---|---|---|---|
| Cold (warm-up) | -40 | 70 | Normal — avoid high load |
| Normal | 70 | 105 | Normal operation |
| Warning | 105 | 115 | Reduce load, check cooling |
| Critical | 115 | 215 | Immediate shutdown risk |

**User Configurable Thresholds:**
- Warning threshold: default 105°C (adjustable 80–125°C)
- Critical threshold: default 115°C (adjustable Warning+1 – 130°C)

**Notes:**
- The Thermal tab displays a zone bar (Cold / Normal / Warning / Critical) with live needle
- Cooling fan override (`fan_main`) can be triggered manually from the Thermal tab
- ECT is critical for closed-loop fuel management — sensor failure will force open-loop operation

---

### 7.3 TPS — Throttle Position Sensor

| Property | Value |
|---|---|
| PID | `0111` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `A × (100 / 255)` |
| Unit | % |
| Tier | BASE — Required |

**Operating Ranges:**

| Range | Min | Max | Action |
|---|---|---|---|
| Closed | 0 | 2 | Normal |
| Partial | 2 | 97 | Normal |
| Wide Open Throttle (WOT) | 97 | 100 | Monitor fuel trims |

**Notes:**
- TPS is displayed as a bar gauge on the Digital Dash
- Sticking TPS (value stuck at non-idle position at rest) will cause incorrect fueling
- Required for throttle-based fuel mapping

---

### 7.4 VBAT — Battery / Charging Voltage

| Property | Value |
|---|---|
| PID | `0142` |
| OBD Mode | Mode 01 |
| Response Bytes | 2 |
| Formula | `((A × 256) + B) / 1000` |
| Unit | V |
| Tier | BASE — Required |

**Operating Ranges:**

| Range | Min | Max | Action |
|---|---|---|---|
| Low / Discharging | 0 | 12.0 | Check alternator / battery |
| Normal | 12.5 | 14.5 | Normal — charging system OK |
| Warning High | 14.5 | 16.0 | Possible overcharge |
| Critical High | 16.0 | 20.0 | Charging system fault |

**Notes:**
- Voltage is displayed on the Digital Dash status row
- The F300 uses a 12V electrical architecture
- Voltage drop under load below 11.8V may indicate failing battery

---

## 8. Required Sensors — Performance Operation

These sensors are required for full engine management and performance monitoring. They are always active and cannot be disabled.

---

### 8.1 MAP — Manifold Absolute Pressure

| Property | Value |
|---|---|
| PID | `010B` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `A` (value in kPa) |
| Unit | kPa |
| Tier | PERFORMANCE — Required |

**Operating Ranges:**

| Condition | Range (kPa) | Notes |
|---|---|---|
| Engine off (atmospheric) | ~101 | Sea level reference |
| Idle (vacuum) | 20 – 40 | High vacuum at closed throttle |
| Partial load | 40 – 160 | Normal driving |
| WOT (naturally aspirated) | 90 – 101 | Near atmospheric |
| Warning | 200 – 255 | Sensor fault or boost (if applicable) |

**Notes:**
- MAP is the primary load reference for fuel and ignition tables
- A failed MAP sensor will cause incorrect fueling across all load points

---

### 8.2 ENGINE LOAD — Calculated Engine Load

| Property | Value |
|---|---|
| PID | `0104` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `A × (100 / 255)` |
| Unit | % |
| Tier | PERFORMANCE — Required |

**Operating Ranges:**

| Range | Action |
|---|---|
| 0–85% | Normal operation |
| 85–100% | High load — monitor temperatures |

**Notes:**
- Calculated load is a normalized value derived from MAF or MAP
- Useful for confirming throttle position correlates with actual engine demand

---

## 9. Optional Sensors — Extended Suite

These sensors can be toggled ON/OFF by the user in the Sensors tab depending on which sensors are physically installed. When toggled off, values are hidden from all tuning views but the ECU still reports them if available.

---

### 9.1 IAT — Intake Air Temperature

| Property | Value |
|---|---|
| PID | `010F` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `A - 40` |
| Unit | °C |
| Tier | EXTENDED — Optional |
| Default | Enabled |

**Operating Ranges:**

| Range | Action |
|---|---|
| -10 – 50°C | Normal — dense air charge |
| 50 – 60°C | Warning — watch for detonation |
| 60°C+ | Critical — power loss risk, reduce boost if applicable |

**Hardware Requirement:** IAT sensor threaded into intake manifold or intake pipe  
**Sensor Type:** NTC thermistor, typically combined with MAF sensor on EFI engines

**Notes:**
- Higher IAT reduces air density and increases knock risk
- Many ECUs use IAT for ignition retard correction
- On the GTR250R, the IAT sensor is located pre-throttle body

---

### 9.2 STFT — Short Term Fuel Trim

| Property | Value |
|---|---|
| PID | `0106` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `((A - 128) × 100) / 128` |
| Unit | % |
| Range | -100% to +99.2% |
| Tier | EXTENDED — Optional |
| Default | Enabled |

**Operating Ranges:**

| Range | Interpretation |
|---|---|
| -10% to +10% | Normal closed-loop correction |
| -20% to -10% | System running rich — check injectors, O2, fuel pressure |
| +10% to +20% | System running lean — check air leaks, MAF, injectors |
| ±25%+ | Severe fueling fault — code likely set |

**Hardware Requirement:** Functioning O2 sensor (wideband or narrowband)  
**Dependency:** Requires closed-loop fuel control in ECU

---

### 9.3 LTFT — Long Term Fuel Trim

| Property | Value |
|---|---|
| PID | `0107` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `((A - 128) × 100) / 128` |
| Unit | % |
| Range | -100% to +99.2% |
| Tier | EXTENDED — Optional |
| Default | Enabled |

**Operating Ranges:**

| Range | Interpretation |
|---|---|
| -5% to +5% | Normal learned trim |
| -10% to -5% | Mild rich condition — monitor |
| +5% to +10% | Mild lean condition — investigate intake leaks, MAF calibration |
| ±15%+ | Significant fueling fault — service required |

**Notes:**
- LTFT is the ECU's learned correction — it represents accumulated fuel bias
- A large positive LTFT indicates the ECU has learned the engine is consistently lean
- LTFT + STFT combined deviation >25% typically triggers a P0171/P0172

---

### 9.4 O2 — Oxygen Sensor Voltage (Bank 1, Sensor 1)

| Property | Value |
|---|---|
| PID | `0114` |
| OBD Mode | Mode 01 |
| Response Bytes | 1 |
| Formula | `A / 200` |
| Unit | V |
| Range | 0.0 – 1.275V |
| Tier | EXTENDED — Optional |
| Default | Enabled |

**Voltage Interpretation (Narrowband NTK/Bosch):**

| Voltage | Mixture | Action |
|---|---|---|
| 0.0 – 0.3V | Lean | Normal lean sweep |
| 0.3 – 0.5V | Near stoich | Normal |
| ~0.45V | Stoich (λ=1.0) | Target in steady cruise |
| 0.5 – 0.9V | Rich | Normal rich sweep |
| Static low (<0.1V) | Sensor cold/failed | Check heating circuit |
| Static high (>0.9V) | Rich lock or sensor fault | Check ECU |

**Derived Values:**
- Lambda (λ) = O2 voltage / 0.45 (approximate, narrowband)
- AFR = λ × 14.7 (for gasoline)

**Note:** PID `0114` returns narrowband voltage. Wideband sensors require custom CAN mapping.

---

## 10. Actuator Controls

Actuator commands are issued via **OBD Mode 08** (Request Control of On-Board System). All commands are routed through the ESP32 firmware's `actuateControl()` function.

### ⚠️ Safety Warning
Actuator commands directly activate physical components. Only issue these commands when the vehicle is safely stationary unless operating under explicit track engineer supervision.

---

### 10.1 fan_main — Main Cooling Fan

| Property | Value |
|---|---|
| Firmware Control ID | `fan_main` |
| OBD Mode 08 ON Command | `0801` |
| OBD Mode 08 OFF Command | `0800` |
| App Command | `{ "command": "actuate", "control": "fan_main", "state": true/false }` |
| Hardware | Primary radiator fan motor relay |

**Use Cases:**
- Manual cooling after hard track session
- Debugging cooling system issues
- Post-session cool-down with engine idling

---

### 10.2 pump_aux — Auxiliary Pump

| Property | Value |
|---|---|
| Firmware Control ID | `pump_aux` |
| OBD Mode 08 ON Command | `0803` |
| OBD Mode 08 OFF Command | `0802` |
| App Command | `{ "command": "actuate", "control": "pump_aux", "state": true/false }` |
| Hardware | Auxiliary fluid circulation pump |

**Use Cases:**
- Pre-heating coolant for cold starts
- Post-session heat soak management
- Transmission or differential oil cooler activation (vehicle-dependent)

**Caution:** Do not run auxiliary pump dry. Verify fluid levels before activation.

---

### 10.3 Expansion Slots (Reserved)

| Slot | ON | OFF | Assigned |
|---|---|---|---|
| Slot 3 | `0805` | `0804` | Unassigned |
| Slot 4 | `0807` | `0806` | Unassigned |
| Slot 5 | `0809` | `0808` | Unassigned |

---

## 11. Fuel System Analysis

The Fuel tab provides consolidated analysis of fuel delivery and combustion quality.

### AFR / Lambda Calculation

The app derives approximate AFR from the O2 sensor voltage:

```
λ (lambda) = O2_voltage / 0.45
AFR        = λ × 14.7   (for gasoline, stoichiometric ratio)
```

This is an approximation using a narrowband O2 sensor mid-point (0.45V ≈ λ=1.0).

### Fuel Trim Combined Analysis

```
Total correction = STFT + LTFT

If total > +15% → lean condition (air leak, MAF fault, low fuel pressure)
If total < -15% → rich condition (injector leak, MAP sensor fault, high fuel pressure)
```

### Fuel Loop Status Field

The Fuel tab displays a **LOOP STATUS** field sourced from `telemetry.fuel_status`. This field maps to OBD PID `0103` (Fuel System Status).

> **Status: Not yet implemented in firmware.** PID `0103` is not in the Vehicle Node v2.0.0 polling list. The `fuel_status` field will always be `undefined` and display as `—` until the firmware polling list is updated to include PID `0103`. This is a pending firmware addition.

---

## 12. Thermal Management

### Temperature Threshold Configuration

Thresholds control visual alert states only. They do not modify ECU protection parameters.

| Threshold | Default | Min | Max | Purpose |
|---|---|---|---|---|
| ECT Warning | 105°C | 80°C | Critical-1 | Yellow alert trigger |
| ECT Critical | 115°C | Warning+1 | 130°C | Red alert trigger |

**Persistence:** ECT thresholds are saved to `AsyncStorage` under keys `tuning_ect_warn` and `tuning_ect_crit`. Values persist across app restarts and tab navigation. Defaults (105°C / 115°C) are used if no saved value exists.

### Thermal Zone Bar

The ECT display renders a zone bar representing the full sensor range (-40°C to 215°C) divided into:

- **Cold zone** (blue): -40°C to 70°C
- **Normal zone** (green): 70°C to Warning threshold
- **Warning zone** (yellow): Warning to Critical threshold
- **Critical zone** (red): Critical threshold to 215°C

A live needle moves across this bar based on the current ECT reading.

---

## 13. Diagnostics & Fault Codes

### DTC Scan — Protocol

Sending `{ "command": "get_dtc" }` triggers an OBD Mode 03 (`03`) query on the firmware. The ESP32 parses the response byte pairs and decodes them into standard SAE DTCs.

**DTC Format:**
```
Byte 1 bits 7-6: Code type  (00=P, 01=C, 10=B, 11=U)
Byte 1 bits 5-4: Sub-type   (00, 01, 02, 03)
Byte 1 bits 3-0: Code digit 1
Byte 2 bits 7-4: Code digit 2
Byte 2 bits 3-0: Code digit 3
→ Result: P0XXX, C0XXX, B0XXX, U0XXX
```

### DTC Clear — Protocol

Sending `{ "command": "clear_dtc" }` triggers OBD Mode 04 (`04`). This:
- Clears all stored DTCs from ECU memory
- Resets the MIL (Check Engine Light)
- Clears freeze frame data
- Resets readiness monitors (I/M monitors will need drive cycle to reset)

**The app requires a double-press confirmation before clearing to prevent accidental erasure.**

### Supported DTC Ranges

| Prefix | System |
|---|---|
| P | Powertrain (engine, transmission) |
| C | Chassis (ABS, steering, suspension) |
| B | Body (airbags, HVAC, lighting) |
| U | Network (CAN bus, module communication) |

---

## 14. Raw OBD Console

The Console tab provides direct access to the OBD II communication layer. Commands are forwarded to the ESP32 which sends them directly to the ELM327 chip.

### Command Format

Enter raw OBD commands in hexadecimal. The firmware prepends nothing and sends as-is.

**Examples:**

| Input | Description |
|---|---|
| `010C` | Mode 01, PID 0C — Engine RPM |
| `0105` | Mode 01, PID 05 — Coolant Temp |
| `0100` | Mode 01, PID 00 — Supported PIDs bitmap 01–20 |
| `0902` | Mode 09, PID 02 — VIN |
| `03` | Mode 03 — Read stored DTCs |
| `04` | Mode 04 — Clear DTCs |
| `ATZ` | ELM327 reset |
| `ATDP` | Display current OBD protocol |
| `ATSP0` | Set protocol to auto |

### Response Format

ELM327 responses follow the format `4X YY [data]` where `4X` = Mode+0x40, `YY` = PID.

Example: `010C` → `41 0C 0D 02` → RPM = ((0x0D × 256) + 0x02) / 4 = 833 rpm

---

## 15. Poll Rate Configuration

The firmware polls OBD PIDs in a round-robin sequence at a configurable rate.

| Rate | Interval | Use Case |
|---|---|---|
| 1 Hz | 1000ms | Logging, low-priority monitoring |
| 5 Hz | 200ms | Standard monitoring |
| 10 Hz (default) | 100ms | Performance monitoring |
| 15 Hz | 67ms | Track use, high-speed logging |
| 20 Hz | 50ms | Maximum rate — high CPU load |

**Firmware Note:** The `set_poll_rate` command handler in v2.0.0 must use an `int` variable (`int obdPollIntervalMs = 100;`) rather than a preprocessor `#define`. Assigning to `#define OBD_POLL_INTERVAL_MS` at runtime is a compile error in C — the firmware must declare `obdPollIntervalMs` as a mutable variable and assign `obdPollIntervalMs = 1000 / rate` in the command handler. This is a required firmware fix before `set_poll_rate` will compile and function.

```
Effective per-PID rate = Total poll rate / Number of active PIDs

Example: 10 PIDs at 10 Hz → each PID updates at ~1 Hz
Example: 4 PIDs at 10 Hz → each PID updates at ~2.5 Hz
```

---

## 16. GTR250R Engine Notes

The Reycin F300 is sold without an engine. The **GTR250R** is the Reycin-recommended powerplant.

| Parameter | Specification |
|---|---|
| Configuration | Single cylinder, 4-stroke |
| Displacement | 250cc |
| Redline | 9800 rpm |
| Fuel | 91+ RON (Premium Unleaded) |
| Stoich AFR | 14.7 : 1 |
| WOT Target AFR | 12.5 – 13.0 : 1 |
| Idle AFR | 14.5 – 15.5 : 1 |
| Max STFT Deviation | ±10% |
| Max LTFT Deviation | ±5% |
| Normal ECT | 70 – 105°C |
| Normal IAT | 5 – 45°C |
| Normal MAP at Idle | 25 – 40 kPa |
| Normal MAP at WOT | 90 – 101 kPa |

**Note:** These specifications apply to the GTR250R installation. Users installing alternative engines should update their threshold configurations in the Thermal tab accordingly.

---

## 17. Expansion & Future Sensors

The following sensors are planned for future firmware and tuning console integration:

| Sensor | PID | Description | Tier |
|---|---|---|---|
| MAF | `0110` | Mass Air Flow Rate (g/s) | Performance |
| Fuel System Status | `0103` | Open/closed loop status — currently unimplemented | Performance |
| Fuel Rail Pressure | `0123` | Absolute fuel rail pressure | Expanded |
| EGR Commanded | `012C` | EGR valve position | Expanded |
| Boost Pressure | `0133` | Barometric pressure reference | Expanded |
| Catalyst Temp B1S1 | `013C` | Upstream catalyst temperature | Expanded |
| Catalyst Temp B1S2 | `013E` | Downstream catalyst temperature | Expanded |
| Knock Retard | `024F` | Knock-based ignition retard | Performance |
| Fuel Injection Timing | `014A` | Injection pulse timing | Expanded |
| Accelerator Position | `0149` | Accelerator pedal position D | Performance |
| Oil Temp | Custom | Oil temperature (manufacturer PID) | Expanded |
| EGT | Custom | Exhaust Gas Temperature (manufacturer PID) | Expanded |
| Wideband AFR | CAN | Requires wideband controller | Performance |

---

## 18. OBD Mode Reference

| Mode | Hex | Description |
|---|---|---|
| Mode 01 | `01` | Show current live data (PIDs) |
| Mode 02 | `02` | Show freeze frame data |
| Mode 03 | `03` | Show stored / active DTCs |
| Mode 04 | `04` | Clear DTCs, reset MIL |
| Mode 05 | `05` | Oxygen sensor test results |
| Mode 06 | `06` | On-board monitoring test results |
| Mode 07 | `07` | Show pending DTCs |
| Mode 08 | `08` | Request control of on-board system (actuators) |
| Mode 09 | `09` | Request vehicle information (VIN, calibration IDs) |
| Mode 0A | `0A` | Permanent DTC log |

---

## 19. Safety Protocols & Data Logging

### Actuator Safety

- Never activate `pump_aux` without confirming fluid levels
- Never activate cooling fan while hands are near the fan assembly
- Actuator override does not guarantee ECU protection logic is bypassed — ECU may reject commands on some vehicles

### DTC Clear Safety

- Clearing DTCs resets I/M readiness monitors — vehicle may fail emissions inspection immediately after
- Do not clear DTCs without noting the codes for diagnostic reference
- Clearing does not fix the underlying condition — codes will return if fault is present

### Sensor Threshold Safety

- Warning and critical thresholds in the Thermal tab are **alert triggers only**
- They do not modify ECU protection thresholds or fuel cut values
- ECU-level overtemp protection operates independently
- Thresholds persist to `AsyncStorage` and survive app restarts

### Data Logging

- OBD telemetry sessions can be started from the OBD diagnostics screen in the Garage
- Session records are written to Firebase under `reycinUSA/obd/sessions/{push_key}` using Firebase `push()` — the key is auto-generated, **not** a userId-based path. The `uid` field is stored inside the session record as `{ uid: user.uid, vehicleId, startedAt, endedAt, ... }`
- Per-sample telemetry data is written to `reycinUSA/obd/sessionLogs/{sessionId}` with keys of the form `t_{timestamp}`
- High poll rates over extended sessions may generate significant database writes

---

*This document is maintained by the Reycin USA engineering team and reflects firmware v2.0.0 behavior. Updates will be published with each firmware release.*
