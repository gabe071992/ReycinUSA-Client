# Extend the mechanical-watch Race theme and fix Remember Me

**Features**
- [x] Refresh the Race shell with the same brushed-gold mechanical-watch identity already started on Home.
- [ ] Update every Race subtab so Dashboard, Timer, Tracks, R+, Tuning, PIT, and League feel like one premium cockpit system.
- [x] Add tactile button press feedback to Race tab and Tracks subtab controls.
- [x] Make the R+ viewer feel like a precision track instrument set inside a watch dial.
- [x] Keep users logged in after selecting Remember Me until they manually sign out.

**Design**
- [x] Use deep black plates, brushed gold borders, champagne highlights, and subtle engraved divider lines in the Race shell and R+ viewport.
- [ ] Replace plain cards with layered dial-like panels, beveled rings, small screw details, and instrument-style labels across every Race subview.
- [x] Add visible mechanical details in the Race background without making the app feel cartoonish or toy-like.
- [ ] Use restrained, premium animations so gears and dial hands move slowly and deliberately.
- [x] Keep racing data readable first, with gold accents used for hierarchy rather than decoration everywhere.

**Race Dashboard**
- Rework the main Race landing view into a mechanical instrument cluster.
- Style speed, RPM, OBD status, session summaries, and quick actions as precision gauges.
- Add subtle dial sweep movement when values update or demo data changes.
- Update inactive and empty states so they still feel intentional and premium.

**Lap Timer**
- Restyle the timer as a central chronograph complication.
- Use concentric rings, split-time markers, and gold timing accents.
- Add press feedback to start, stop, reset, and save controls.
- Make recorded laps and session cards match the new dial-panel language.

**Tracks: Library, My Tracks, and R+**
- [x] Rename and visually unify the Tracks subtabs as premium segmented watch controls.
- [ ] Update Library and My Tracks cards with engraved map plates and gold route details.
- [x] Reframe R+ as a precision viewport rather than a standalone technical embed.
- [x] Surround the R+ viewer with a dial bezel and refined controls.
- [x] Keep R+ map readability and performance as the top priority while adding the theme.

**Tuning**
- Convert tuning panels into calibrated mechanical readouts.
- Style sensors, warnings, optional toggles, and configuration controls as instrument modules.
- Use gold only for active ranges, selected states, and important thresholds.
- Keep dense tuning data compact and scannable.

**PIT / Track Support**
- Restyle messages, logs, forms, priorities, and support controls with the same watch-plate system.
- Use subtle visual differences for urgency without clashing with the premium palette.
- Add tactile press feedback to send, priority, and filter controls.

**League**
- Update League home, library, series detail, schedules, standings, rules, and video screens.
- Make the streaming/library experience feel like a premium motorsport network inside the Race tab.
- Replace ad-like presentation with curated library shelves, gold metadata tags, and cinematic dark panels.

**Login Remember Me**
- [x] Make Remember Me persist the authenticated session until the user signs out.
- [x] Ensure the login state is restored reliably on app restart.
- [x] Preserve manual sign-out behavior so signing out always returns the user to login.
- [x] Avoid storing sensitive password data.

**Quality checks**
- Review all Race screens for visual consistency, readable contrast, and safe spacing around the bottom navigation.
- Verify Remember Me behavior across fresh launch, normal sign-in, sign-out, and app restart scenarios.
- Run validation checks after implementation and fix any issues found.