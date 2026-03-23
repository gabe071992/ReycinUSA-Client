# Reycin Tuning Console — System Documentation

**Version:** 1.0.0  
**Platform:** Reycin USA Mobile App  
**Firmware Target:** Reycin OBD II ESP32 v1.0.0  
**Vehicle Target:** Reycin F300 / GTR250R Engine Configuration  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Connection Architecture](#2-connection-architecture)
3. [Sensor Inventory](#3-sensor-inventory)
4. [Required Sensors — Base Operation](#4-required-sensors--base-operation)
5. [Required Sensors — Performance Operation](#5-required-sensors--performance-operation)
6. [Optional Sensors — Extended Suite](#6-optional-sensors--extended-suite)
7. [Actuator Controls](#7-actuator-controls)
8. [Fuel System Analysis](#8-fuel-system-analysis)
9. [Thermal Management](#9-thermal-management)
10. [Diagnostics & Fault Codes](#10-diagnostics--fault-codes)
11. [Raw OBD Console](#11-raw-obd-console)
12. [Poll Rate Configuration](#12-poll-rate-configuration)
13. [GTR250R Engine Notes](#13-gtr250r-engine-notes)
14. [Expansion & Future Sensors](#14-expansion--future-sensors)
15. [OBD Mode Reference](#15-obd-mode-reference)
16. [Safety Protocols](#16-safety-protocols)

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
ESP32-WROOM-32 (Reycin OBD Adapter)
      │
      │  UART Serial (38400 baud)
      │
ELM327 / STN1110 OBD II Chip
      │
      │  OBD II Protocols (CAN, KWP2000, ISO 9141-2, J1850)
      │
Vehicle ECU
```

### Command Protocol

All commands are JSON objects. The `command` field is the primary dispatcher.

**From App → ESP32:**
```json
{ "command": "get_dtc" }
{ "command": "clear_dtc" }
{ "command": "set_poll_rate", "rate": 10 }
{ "command": "actuate", "control": "fan_main", "state": true }
{ "command": "raw_obd", "cmd": "010C" }
```

**From ESP32 → App (Telemetry push, every complete PID cycle):**
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

---

## 2. Connection Architecture

| Parameter | Value |
|---|---|
| Transport | WebSocket |
| Address | ws://192.168.4.1:81 |
| WiFi SSID | `Reycin_OBD_XXXXXX` (device-specific) |
| WiFi Password | `reycin123` (change in production) |
| Protocol | JSON over WebSocket text frames |
| Auto-reconnect | 3 second retry |

### Connection States

| State | Description |
|---|---|
| `disconnected` | No active WebSocket session |
| `connecting` | WebSocket handshake in progress |
| `connected` | Active session, telemetry flowing |
| `error` | Connection failed, reconnect scheduled |

---

## 3. Sensor Inventory

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
| `offline` | Gray `#333` | Sensor not connected or disabled |

---

## 4. Required Sensors — Base Operation

These sensors are **always active** and cannot be disabled. They represent the minimum sensor suite for safe vehicle operation.

---

### 4.1 RPM — Engine Speed

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

### 4.2 ECT — Engine Coolant Temperature

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
- Cooling fan override (fan_main) can be triggered manually from Thermal tab
- ECT is critical for closed-loop fuel management — sensor failure will force open-loop operation

---

### 4.3 TPS — Throttle Position Sensor

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

### 4.4 VBAT — Battery / Charging Voltage

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

## 5. Required Sensors — Performance Operation

These sensors are required for full engine management and performance monitoring. They are always active and cannot be disabled.

---

### 5.1 MAP — Manifold Absolute Pressure

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

### 5.2 ENGINE LOAD — Calculated Engine Load

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

## 6. Optional Sensors — Extended Suite

These sensors can be toggled ON/OFF by the user in the Sensors tab depending on which sensors are physically installed. When toggled off, values are hidden from all tuning views but the ECU still reports them if available.

---

### 6.1 IAT — Intake Air Temperature

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

### 6.2 STFT — Short Term Fuel Trim

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

**Notes:**
- STFT reflects immediate corrections the ECU is making to reach stoichiometry
- Large STFT values indicate the ECU is working hard to correct a fueling error
- STFT should return toward 0% in steady-state driving

---

### 6.3 LTFT — Long Term Fuel Trim

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

**Hardware Requirement:** Same as STFT  
**Dependency:** Requires multiple warm drive cycles to build meaningful data

**Notes:**
- LTFT is the ECU's learned correction — it represents accumulated fuel bias
- A large positive LTFT indicates the ECU has learned the engine is consistently lean
- LTFT + STFT combined deviation >25% typically triggers a P0171/P0172

---

### 6.4 O2 — Oxygen Sensor Voltage (Bank 1, Sensor 1)

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

**Hardware Requirement:** Narrowband or wideband O2 sensor in exhaust manifold/downpipe  
**Note:** PID `0114` returns narrowband voltage. Wideband sensors require custom CAN mapping.

---

## 7. Actuator Controls

Actuator commands are issued via **OBD Mode 08** (Request Control of On-Board System). All commands are routed through the ESP32 firmware's `actuateControl()` function.

### ⚠️ Safety Warning
Actuator commands directly activate physical components. Only issue these commands when the vehicle is safely stationary unless operating under explicit track engineer supervision.

---

### 7.1 fan_main — Main Cooling Fan

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

### 7.2 pump_aux — Auxiliary Pump

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

### 7.3 Expansion Slots (Reserved)

The following Mode 08 command pairs are reserved for future actuator mapping:

| Slot | ON | OFF | Assigned |
|---|---|---|---|
| Slot 3 | `0805` | `0804` | Unassigned |
| Slot 4 | `0807` | `0806` | Unassigned |
| Slot 5 | `0809` | `0808` | Unassigned |

Future firmware releases will expose additional control IDs for these slots as hardware definitions are finalized.

---

## 8. Fuel System Analysis

The Fuel tab provides consolidated analysis of fuel delivery and combustion quality.

### AFR / Lambda Calculation

The app derives approximate AFR from the O2 sensor voltage using the formula:

```
λ (lambda) = O2_voltage / 0.45
AFR        = λ × 14.7   (for gasoline, stoichiometric ratio)
```

This is an approximation using a narrowband O2 sensor mid-point (0.45V ≈ λ=1.0). For accurate wideband AFR measurements, a standalone wideband controller with CAN output is required.

### Fuel Trim Combined Analysis

```
Total correction = STFT + LTFT

If total > +15% → lean condition (air leak, MAF fault, low fuel pressure)
If total < -15% → rich condition (injector leak, MAP sensor fault, high fuel pressure)
```

---

## 9. Thermal Management

### Temperature Threshold Configuration

Thresholds are stored in local app state and do not modify ECU parameters. They control visual alert states only.

| Threshold | Default | Min | Max | Purpose |
|---|---|---|---|---|
| ECT Warning | 105°C | 80°C | Critical-1 | Yellow alert trigger |
| ECT Critical | 115°C | Warning+1 | 130°C | Red alert trigger |

### Thermal Zone Bar

The ECT display renders a zone bar representing the full sensor range (-40°C to 215°C) divided into:

- **Cold zone** (blue): -40°C to 70°C
- **Normal zone** (green): 70°C to Warning threshold
- **Warning zone** (yellow): Warning to Critical threshold
- **Critical zone** (red): Critical threshold to 215°C

A live needle moves across this bar based on the current ECT reading.

---

## 10. Diagnostics & Fault Codes

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

## 11. Raw OBD Console

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

## 12. Poll Rate Configuration

The firmware polls OBD PIDs in a round-robin sequence at a configurable rate.

| Rate | Interval | Use Case |
|---|---|---|
| 1 Hz | 1000ms | Logging, low-priority monitoring |
| 5 Hz | 200ms | Standard monitoring |
| 10 Hz (default) | 100ms | Performance monitoring |
| 15 Hz | 67ms | Track use, high-speed logging |
| 20 Hz | 50ms | Maximum rate — high CPU load |

**Firmware Limit:** 20 Hz maximum per firmware spec (`pollInterval = 1000 / rate`).  
**Practical Note:** At higher poll rates with many PIDs enabled, individual PID update frequency decreases as each PID takes one slot in the round-robin cycle.

```
Effective per-PID rate = Total poll rate / Number of active PIDs

Example: 10 PIDs at 10 Hz → each PID updates at ~1 Hz
Example: 4 PIDs at 10 Hz → each PID updates at ~2.5 Hz
```

---

## 13. GTR250R Engine Notes

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

## 14. Expansion & Future Sensors

The following sensors are planned for future firmware and tuning console integration:

| Sensor | PID | Description | Tier |
|---|---|---|---|
| MAF | `0110` | Mass Air Flow Rate (g/s) | Performance |
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

## 15. OBD Mode Reference

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

## 16. Safety Protocols

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

### Data Logging

- OBD telemetry sessions can be started from the OBD diagnostics screen in the Garage
- Session data is stored in Firebase under `reycinUSA/obd/sessions/{userId}` and `reycinUSA/obd/sessionLogs/{sessionId}`
- High poll rates over extended sessions may generate significant database writes

---

*This document is maintained by the Reycin USA engineering team. Updates will be published with each firmware release.*
