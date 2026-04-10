# League Interface — Implementation Plan Document (LEAGUE_PLAN.md)


## Overview

Create a detailed `LEAGUE_PLAN.md` file inside the project that serves as the full implementation blueprint for the League module — a new **LEAGUE** sub-tab added to the existing Race tab, sitting alongside DASH, TIMER, TRACKS, TUNING, and PIT.

---

## What the Document Will Cover

### 1. Architecture Overview
- Module entry point: new `"league"` case added to `RaceTab` type and `RACE_TABS` array
- Firebase RTDB root path: `reycinUSA/works/league/`
- All data flows read-only from Firebase (admin writes, client reads)
- Real-time listeners via `onValue` for live data

---

### 2. Phased Rollout Plan

**Phase 1 — Foundation & Browse**
- Firebase provider (`LeagueProvider`) using `createContextHook`
- Leagues home screen (active leagues list)
- Series detail screen
- Event schedule screen (upcoming events)

**Phase 2 — Results & Standings**
- Event results screen (completed races with bonus icons)
- Driver championship standings (ARC points, computed client-side)
- Team / Mechanics Cup standings (with per-event bonus computation)

**Phase 3 — Profiles, Rules & Media**
- Team profile screen (drivers, vehicles)
- Driver profile cards
- Rules browser (markdown rendered, grouped by category)
- Watch / streaming screen (video player from media collection)

---

### 3. Screen-by-Screen Breakdown

| Screen | Firebase Path | Key Logic |
|---|---|---|
| **Leagues Home** | `league/leagues` | Filter `status === "active"`, show logo + season |
| **Series Detail** | `league/series`, `hpClasses`, `events` | Tab strip: Schedule / Standings / Rules |
| **Event Schedule** | `league/events` | Filter `status === "scheduled"`, sort by date |
| **Event Results** | `league/events/{id}` | results[] sorted by position, render bonus icons 🏁⚡📈🧹 |
| **Driver Standings** | `league/events` (completed) | ARC scale: 25-18-15-12-10-8-6-4-2-1 + bonuses |
| **Team Standings** | computed from driver standings | Team bonuses added per-event on top |
| **Team Profile** | `league/teams`, `drivers`, `vehicles` | Filter drivers/vehicles by teamId |
| **Driver Profile** | `league/drivers/{id}` | Stats, license class, car number, photo |
| **Rules Browser** | `league/rules` | Filter by seriesId, grouped by category, markdown body |
| **Watch / Stream** | `league/media` | Filter `type === "video"`, mp4 playback, thumbnail grid |

---

### 4. Firebase Integration Strategy

- **Provider**: `LeagueProvider` built with `createContextHook`, wraps all Firebase listeners
- **Pattern**: `onValue` real-time listeners for leagues, series, events; `get` for single-record lookups
- **Indexes documented**: `events.indexOn: [seriesId, status, date]`, `media.indexOn: [leagueId, type]`, etc.
- **Data normalization**: Firebase push-key objects converted to typed arrays via `Object.entries()`
- **Types**: Full TypeScript interfaces for `League`, `Series`, `HpClass`, `Team`, `Driver`, `Vehicle`, `LeagueEvent`, `EventResult`, `Rule`, `MediaItem`

---

### 5. Standings Computation Logic

**ARC Driver Championship**
- Points scale array: `[25, 18, 15, 12, 10, 8, 6, 4, 2, 1]`
- DNF = 0 position points, bonus points still eligible
- Bonus fields: `polePosition`, `fastestLap`, `mostPositionsGained`, `cleanRace` → +1 each
- Aggregates: `wins`, `podiums`, `dnfs`, `bonusPoints` per driver

**Mechanics Cup (Teams)**
- Step 1: sum all driver points per team
- Step 2: per-event team bonuses layered on top
  - Fastest lap (any car): +3
  - Pole position (any car): +2
  - Both cars top 10: +5
  - All cars finish (no DNFs): +3
  - All cars clean race: +3
- `bonusPoints` shown as "+N" indicator in standings table

---

### 6. Component Structure

**Reusable Components**
- `LeagueHero` — league logo + name banner
- `SeriesCard` — series preview card with schedule text
- `EventCard` — event date/location/status badge
- `ResultRow` — driver result with position, time, bonus icons
- `StandingsRow` — rank, driver/team name, points, "+N" bonus chip
- `BonusIcon` — inline 🏁⚡📈🧹 flags with tooltips
- `DriverCard` — photo, name, car number, license class badge
- `VehicleCard` — make/model/year/hp/weight/photo
- `RuleSection` — category header + markdown-rendered rule body
- `VideoThumbnailCard` — poster image, title, play button
- `ClassBadge` — HP class label pill (e.g. "600HP Street")

---

### 7. State Management Plan

- **`LeagueProvider`** (`createContextHook`): holds leagues, series, hpClasses, teams, drivers, vehicles, events, rules, media — all populated via Firebase `onValue` listeners on mount
- **Local screen state**: selected `leagueId`, `seriesId`, active standings tab (Driver vs Team) — kept in component `useState`, not persisted
- **Computed selectors**: utility hooks like `useDriverStandings(seriesId)`, `useTeamStandings(seriesId)`, `useSeriesEvents(seriesId)` — all derived from provider data via `useMemo`
- **No AsyncStorage** for league data (always fresh from Firebase)
- **React Query**: used only if direct Firebase SDK calls don't fit cleanly; preferred pattern is `onValue` listeners inside the provider

---

### 8. Navigation Flow (within LEAGUE tab)

```
LEAGUE tab
 └── Leagues Home (list)
      └── Series Detail
           ├── Schedule tab → Event Card → Event Results
           ├── Standings tab → Driver Standings / Team Standings → Profile
           └── Rules tab → Rules Browser
 └── Team Profile → Driver Profile
 └── Watch screen (media / video)
```

Navigation handled via internal `useState` stack within the League module (no new Expo Router routes needed — self-contained inside the Race tab content area).

---

### 9. File Structure to Be Created

```
expo/
  providers/
    LeagueProvider.tsx          ← Firebase listeners + context
  app/(tabs)/race/
    league/
      LeagueHome.tsx            ← Phase 1
      SeriesDetail.tsx          ← Phase 1
      EventSchedule.tsx         ← Phase 1
      EventResults.tsx          ← Phase 2
      DriverStandings.tsx       ← Phase 2
      TeamStandings.tsx         ← Phase 2
      TeamProfile.tsx           ← Phase 3
      DriverProfile.tsx         ← Phase 3
      RulesBrowser.tsx          ← Phase 3
      WatchScreen.tsx           ← Phase 3
  components/league/
    LeagueHero.tsx
    SeriesCard.tsx
    EventCard.tsx
    ResultRow.tsx
    StandingsRow.tsx
    BonusIcon.tsx
    DriverCard.tsx
    VehicleCard.tsx
    RuleSection.tsx
    VideoThumbnailCard.tsx
  types/
    league.ts                   ← All TypeScript interfaces
LEAGUE_PLAN.md                  ← The document being planned here
```
