# Fix all identified gaps — PITProvider protocol bug, ECT threshold persistence, and full documentation rewrite to v2.0.0


## Changes

### Fix 1 — Critical live bug: PITProvider registration handshake (GAP 11)
**File:** `expo/providers/PITProvider.tsx`

On WebSocket open, the Driver app currently sends `{ "type": "driver_ready", "role": "driver" }`. Hub v2.0.0 firmware's `handleClientMessage()` expects `{ "type": "register", "role": "driver" }` — `driver_ready` is an unknown type and the Hub rejects it silently. The Driver app never completes role registration, meaning the Hub will never route `pit_message` frames to it.

**Change:** Replace the single line on `ws.onopen`:
```
ws.send(JSON.stringify({ type: "driver_ready", role: "driver" }));
```
→
```
ws.send(JSON.stringify({ type: "register", role: "driver" }));
```

---

### Fix 2 — ECT threshold persistence (GAP 12)
**File:** `expo/app/(tabs)/race/tuning.tsx`

`ectWarn` and `ectCrit` are plain `useState` inside `TuningConsole`. They reset to 105°C / 115°C every time the user navigates away from the Tuning tab.

**Change:**
- Add `AsyncStorage` reads on mount to load saved thresholds (`tuning_ect_warn`, `tuning_ect_crit`)
- Wrap `setEctWarn` / `setEctCrit` to also write to AsyncStorage on every change
- Defaults remain 105 / 115 if no stored value exists

---

### Fix 3 — Full TUNING_SYSTEM_DOCUMENTATION.md rewrite (GAPs 1–10, 12–13)
**File:** `expo/TUNING_SYSTEM_DOCUMENTATION.md`

Complete rewrite correcting every identified gap. Specific changes per gap:

| Gap | Change |
|---|---|
| GAP 1 | Header updated: `Firmware Target: Reycin OBD II ESP32 v2.0.0` |
| GAP 2 | Section 1 telemetry frame replaced with v2.0.0 nested structure (`gps{}` + `obd{}` blocks). App bridge behavior (`obd ?? msg` fallback) documented. |
| GAP 3 | SSID corrected from `Reycin_OBD_XXXXXX` → `Reycin_VEH_XXXXXX` |
| GAP 4 | New section added: **GPS System** — hardware GPS (NEO-6M/NEO-M8N via UART), `gps{}` object fields, phone GPS fallback via `watchPositionAsync`, `gps_update` command, `gps_source` tracking, Digital Dash GPS source indicator |
| GAP 5 | New section added: **OBD State Machine** — three states (`absent` / `no_data` / `active`), UI badge behavior, Hub behavior per state (OBD fields omitted when not active) |
| GAP 6 | Section 12 note updated: `set_poll_rate` compile bug documented — `#define OBD_POLL_INTERVAL_MS` cannot be assigned at runtime; firmware must use `int obdPollIntervalMs = 100;` variable instead. Marked as firmware fix required. |
| GAP 7 | Section 1 + GPS section: documented that when `obd_state == "absent"`, firmware does not push any WebSocket frames. App handles this by reading `phoneLocationRef.current` directly. Firmware should be updated to send GPS-only frames in this state (marked as pending firmware improvement). |
| GAP 8 | New section added: **Mesh Network & Hub Architecture** — ESP-NOW mesh topology, Hub Node at `ws://192.168.5.1:82`, role registration handshake (`register` + role), compact mesh frame format (250-byte ESP-NOW limit, `t/id/ms/sess/lat/lon/spd/hdg/gsrc/rpm/tps/ect/vbat/obd` fields), PITProvider connection flow |
| GAP 9 | Section 8 (Fuel): `fuel_status` / LOOP STATUS field noted as currently always `undefined` — PID 0103 not implemented in firmware. Pending firmware addition. |
| GAP 10 | Section 16 Firebase path corrected: `reycinUSA/obd/sessions/{push_key}` (auto-generated), `uid` stored as field, not path key. `sessionLogs/{sessionId}` structure documented. |
| GAP 11 | Mesh/Hub section documents correct registration handshake: `{ "type": "register", "role": "driver" }` (fixed in PITProvider as Fix 1 above) |
| GAP 12 | Section 9 updated: ECT thresholds are now persisted to `AsyncStorage` keys `tuning_ect_warn` / `tuning_ect_crit` (fixed in tuning.tsx as Fix 2 above) |
| GAP 13 | Section 1 command table updated with four missing entries: `gps_update`, `start_session`, `stop_session`, `get_status` |
