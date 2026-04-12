# League Interface — Implementation Plan (LEAGUE_PLAN.md)

## Status: COMPLETE ✓

All three phases have been implemented and type-checked clean.

---

## Architecture Overview

- Module entry point: `"league"` case added to `RaceTab` type and rendered in `race/index.tsx`
- Firebase RTDB root path: `reycinUSA/works/league/`
- All data flows read-only from Firebase (admin writes, client reads)
- Real-time listeners via `onValue` for live updates on all collections
- Internal navigation stack (`useState<NavEntry[]>`) inside `LeagueModule.tsx` — no new Expo Router routes required

---

## Phased Rollout

### Phase 1 — Foundation & Browse ✓
- [x] `LeagueProvider` built with `createContextHook`, `onValue` listeners for all collections
- [x] `LeagueHome` — active leagues list with logo, season badge, Watch button
- [x] `SeriesDetail` — Schedule / Standings / Rules tab strip
- [x] `EventSchedule` — upcoming/live/completed/cancelled sections via `SectionList`

### Phase 2 — Results & Standings ✓
- [x] `EventResults` — sorted results list, fastest lap banner, bonus legend
- [x] `DriverStandings` — ARC points computed client-side via `computeDriverStandings()`
- [x] `TeamStandings` — Mechanics Cup via `computeTeamStandings()` with per-event bonuses

### Phase 3 — Profiles, Rules & Media ✓
- [x] `TeamProfile` — logo, owner, driver roster, vehicle list
- [x] `DriverProfile` — photo, car number, license class badge, career stats
- [x] `RulesBrowser` — grouped by category, HP classes section, version badges
- [x] `WatchScreen` — video grid with tag filter, opens via `Linking.openURL`

---

## Screen-by-Screen Reference

| Screen | Firebase Path | Key Logic |
|---|---|---|
| Leagues Home | `league/leagues` | Filter `status === "active"` |
| Series Detail | `league/series`, `hpClasses`, `events` | Tab strip: Schedule / Standings / Rules |
| Event Schedule | `league/events` | Filter by `seriesId`, sort by date |
| Event Results | `league/events/{id}` | `results[]` sorted by position, bonus icons |
| Driver Standings | `league/events` (completed) | ARC scale: 25-18-15-12-10-8-6-4-2-1 + bonuses |
| Team Standings | Computed from driver standings | Per-event team bonuses added on top |
| Team Profile | `league/teams`, `drivers`, `vehicles` | Filter drivers/vehicles by `teamId` |
| Driver Profile | `league/drivers/{id}` | Stats, license class, car number, photo |
| Rules Browser | `league/rules` | Filter by `seriesId`, grouped by `category` |
| Watch / Stream | `league/media` | Filter `type === "video"`, tag filter chips |

---

## Standings Computation

### ARC Driver Championship
- Points scale: `[25, 18, 15, 12, 10, 8, 6, 4, 2, 1]`
- DNF = 0 position points; bonus points still eligible
- Bonus fields: `polePosition`, `fastestLap`, `mostPositionsGained`, `cleanRace` → +1 each
- Aggregates tracked: `wins`, `podiums`, `dnfs`, `bonusPoints`

### Mechanics Cup (Teams)
- Step 1: sum all driver points per team
- Step 2: per-event team bonuses:
  - Fastest lap (any car): +3
  - Pole position (any car): +2
  - Both cars top 10: +5
  - All cars finish (no DNFs): +3
  - All cars clean race: +3

---

## Firebase Provider

```
LeagueProvider (createContextHook)
  listeners: leagues, series, hpClasses, teams, drivers,
             vehicles, events, rules, media
  derived maps: driversMap, teamsMap, seriesMap
  loading flag: true until all 9 collections respond
  error flag: surfaces first collection error
```

Firebase RTDB root: `reycinUSA/works/league/`

---

## Component Map

| Component | Location | Purpose |
|---|---|---|
| `LeagueHero` | `components/league/` | League logo + name banner |
| `SeriesCard` | `components/league/` | Series preview with event counts |
| `EventCard` | `components/league/` | Date / location / live-status badge |
| `ResultRow` | `components/league/` | Position, driver, time, bonus icons |
| `StandingsRow` | `components/league/` | Rank badge, name, stats, points |
| `BonusIcon` | `components/league/` | 🏁⚡📈🧹 inline emoji flags |
| `DriverCard` | `components/league/` | Avatar, car number, license class |
| `VehicleCard` | `components/league/` | Photo, make/model/year, HP/weight |
| `RuleSection` | `components/league/` | Category header + rule cards |
| `VideoThumbnailCard` | `components/league/` | Thumbnail, play button, tag row |

---

## File Structure

```
expo/
  providers/
    LeagueProvider.tsx          ✓ Firebase listeners + context
  app/(tabs)/race/
    league/
      LeagueModule.tsx          ✓ Internal nav stack
      LeagueHome.tsx            ✓ Phase 1
      SeriesDetail.tsx          ✓ Phase 1
      EventSchedule.tsx         ✓ Phase 1
      EventResults.tsx          ✓ Phase 2
      DriverStandings.tsx       ✓ Phase 2
      TeamStandings.tsx         ✓ Phase 2
      TeamProfile.tsx           ✓ Phase 3
      DriverProfile.tsx         ✓ Phase 3
      RulesBrowser.tsx          ✓ Phase 3
      WatchScreen.tsx           ✓ Phase 3
  components/league/
    LeagueHero.tsx              ✓
    SeriesCard.tsx              ✓
    EventCard.tsx               ✓
    ResultRow.tsx               ✓
    StandingsRow.tsx            ✓
    BonusIcon.tsx               ✓
    DriverCard.tsx              ✓
    VehicleCard.tsx             ✓
    RuleSection.tsx             ✓
    VideoThumbnailCard.tsx      ✓
  types/
    league.ts                   ✓ All TypeScript interfaces + computation helpers
LEAGUE_PLAN.md                  ✓ This document
```
