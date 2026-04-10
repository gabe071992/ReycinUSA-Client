# ReycinUSA — League Module Implementation Plan

> Blueprint for integrating the League interface as a new **LEAGUE** sub-tab inside the existing Race tab.
> Firebase is already configured. This module is **read-only** — the admin dashboard writes, the client app reads.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Phased Rollout](#2-phased-rollout)
3. [Screen-by-Screen Breakdown](#3-screen-by-screen-breakdown)
4. [Firebase Integration Strategy](#4-firebase-integration-strategy)
5. [TypeScript Type Definitions](#5-typescript-type-definitions)
6. [Standings Computation Logic](#6-standings-computation-logic)
7. [Component Structure](#7-component-structure)
8. [State Management Plan](#8-state-management-plan)
9. [Navigation Flow](#9-navigation-flow)
10. [File Structure](#10-file-structure)
11. [Firebase RTDB Index Rules](#11-firebase-rtdb-index-rules)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Architecture Overview

### Entry Point

The League module is a new sub-tab in the existing Race screen (`expo/app/(tabs)/race/index.tsx`).

**Changes to `race/index.tsx`:**
```ts
// 1. Extend the RaceTab type
type RaceTab = "dash" | "timer" | "tracks" | "tuning" | "pit" | "league";

// 2. Add to RACE_TABS array
{ id: "league", label: "League", short: "LEAGUE" }

// 3. Add case to renderContent()
case "league":
  return <LeagueScreen />;
```

`LeagueScreen` is a self-contained module. All navigation within it is managed by an internal `useState` screen stack — **no new Expo Router files** are created.

### Data Flow

```
Firebase RTDB (reycinUSA/works/league/)
        ↓  onValue listeners
  LeagueProvider (createContextHook)
        ↓  context
  Computed selector hooks (useMemo)
        ↓
  League screen components
```

### Firebase Root Path

```
reycinUSA/works/league/
  ├── leagues/
  ├── series/
  ├── hpClasses/
  ├── teams/
  ├── drivers/
  ├── vehicles/
  ├── events/
  ├── rules/
  └── media/
```

---

## 2. Phased Rollout

### Phase 1 — Foundation & Browse
**Goal**: Users can browse leagues, see series, and check the upcoming schedule.

- [x] Create `expo/types/league.ts` — all TypeScript interfaces
- [x] Create `expo/providers/LeagueProvider.tsx` — Firebase `onValue` listeners for all collections
- [x] Wrap root layout with `LeagueProvider`
- [x] `LeagueHome.tsx` — active leagues list with logo + season badge
- [x] `SeriesDetail.tsx` — series info with inner tab strip (Schedule / Standings / Rules)
- [x] `EventSchedule.tsx` — upcoming events list, sorted by date

### Phase 2 — Results & Standings
**Goal**: Users can view completed race results and the live championship standings.

- [x] `EventResults.tsx` — results table with position, driver, time, bonus icons 🏁⚡📈🧹
- [x] `DriverStandings.tsx` — ARC points table, wins/podiums/DNFs columns, "+N" bonus chip
- [x] `TeamStandings.tsx` — Mechanics Cup table, per-event team bonuses computed client-side

### Phase 3 — Profiles, Rules & Media
**Goal**: Full content depth — team pages, driver cards, rule book, and video streaming.

- [x] `TeamProfile.tsx` — team bio, roster, vehicles list
- [x] `DriverProfile.tsx` — driver headshot, stats, car number, license class
- [x] `RulesBrowser.tsx` — rules grouped by category, markdown body rendered
- [x] `WatchScreen.tsx` — video thumbnail grid, native mp4 player

---

## 3. Screen-by-Screen Breakdown

### 3.1 Leagues Home
**File**: `expo/app/(tabs)/race/league/LeagueHome.tsx`
**Firebase**: `league/leagues`

| Element | Detail |
|---|---|
| Header | "ReycinUSA League" title, season chip (e.g. "2026 Season") |
| League cards | Logo image (`logoUrl`), league name, description truncated to 2 lines, status badge |
| Filter | Only show `status === "active"` leagues |
| Empty state | "No active leagues right now" placeholder |
| Tap action | → `SeriesDetail` for selected league |

Also shows a **Watch** shortcut button in the header to jump directly to video streaming.

---

### 3.2 Series Detail
**File**: `expo/app/(tabs)/race/league/SeriesDetail.tsx`
**Firebase**: `league/series`, `league/hpClasses`, `league/events`

Inner horizontal tab strip: **SCHEDULE** | **STANDINGS** | **RULES**

| Tab | Content |
|---|---|
| SCHEDULE | `EventSchedule` component — upcoming + live events |
| STANDINGS | Toggle between Driver Championship and Mechanics Cup |
| RULES | `RulesBrowser` component |

Top section always shows: series name, description, HP classes as pills (e.g. `600HP Street`, `Street Class`).

---

### 3.3 Event Schedule
**File**: `expo/app/(tabs)/race/league/EventSchedule.tsx`
**Firebase**: `league/events`

| Element | Detail |
|---|---|
| Upcoming section | Filter `status === "scheduled"`, sort by `date` ascending |
| Live banner | Highlighted card for any event with `status === "live"` |
| Past section | Filter `status === "completed"`, last 3 events |
| Event card | Poster image (`posterUrl`), date, location, status chip |
| Tap action | → `EventResults` (if completed or live) |

---

### 3.4 Event Results
**File**: `expo/app/(tabs)/race/league/EventResults.tsx`
**Firebase**: `league/events/{eventId}`, `league/drivers`, `league/vehicles`

| Element | Detail |
|---|---|
| Hero | Event poster, name, date, track/location |
| Results table | Position medal (🥇🥈🥉 for top 3), driver name, car number, time, points |
| Bonus row | Inline icons: 🏁 (pole) ⚡ (fastest lap) 📈 (positions gained) 🧹 (clean) |
| DNF rows | Greyed out, show "DNF" in time column, still show earned bonus icons |
| Resolve | `results[].driverId` → driver name lookup from provider |

---

### 3.5 Driver Championship Standings
**File**: `expo/app/(tabs)/race/league/DriverStandings.tsx`
**Computed from**: all `status === "completed"` events in a series

| Column | Detail |
|---|---|
| Rank | Position number, delta vs previous round (optional Phase 3 enhancement) |
| Driver | Photo thumbnail, first + last name, team name |
| Pts | Total championship points |
| +Bonus | "+N" chip showing bonus points only |
| W / P / DNF | Wins, Podiums, DNFs |

Algorithm: see §6.1

---

### 3.6 Team (Mechanics Cup) Standings
**File**: `expo/app/(tabs)/race/league/TeamStandings.tsx`
**Computed from**: driver standings + per-event team bonuses

| Column | Detail |
|---|---|
| Rank | Position number |
| Team | Logo thumbnail, team name, city/state |
| Pts | Total championship points including team bonuses |
| +Bonus | "+N" chip showing team-level bonus points |
| W / P | Wins, Podiums (sum of all drivers) |

Algorithm: see §6.2

---

### 3.7 Team Profile
**File**: `expo/app/(tabs)/race/league/TeamProfile.tsx`
**Firebase**: `league/teams/{teamId}`, `league/drivers`, `league/vehicles`

Sections:
1. **Hero** — team logo, name, city/state, bio
2. **Roster** — `DriverCard` list filtered by `teamId`
3. **Garage** — `VehicleCard` list filtered by `teamId`

---

### 3.8 Driver Profile
**File**: `expo/app/(tabs)/race/league/DriverProfile.tsx`
**Firebase**: `league/drivers/{driverId}`

| Element | Detail |
|---|---|
| Photo | Large headshot with car number overlay badge |
| Name | Full name + nickname in quotes |
| License class | Color-coded badge (novice=gray, amateur=green, semi-pro=blue, pro=orange, elite=red) |
| Team | Link → `TeamProfile` |
| Season stats | Points, wins, podiums, DNFs (computed from standings) |

---

### 3.9 Rules Browser
**File**: `expo/app/(tabs)/race/league/RulesBrowser.tsx`
**Firebase**: `league/rules`

| Element | Detail |
|---|---|
| Category tabs | Technical / Sporting / Safety / Administrative |
| Rule cards | Title, version badge, effective date, collapsed preview |
| Expanded | Full markdown body rendered (use `Text` with parsed bold/headers — no external MD lib) |
| Version | "v{N} · Effective {date}" shown in muted text |

Filter by `seriesId`. Group by `category`. Sort by `effectiveDate` descending within each group.

---

### 3.10 Watch / Stream
**File**: `expo/app/(tabs)/race/league/WatchScreen.tsx`
**Firebase**: `league/media`

| Element | Detail |
|---|---|
| Filter | `type === "video"`, sort by `uploadedAt` desc |
| Thumbnail grid | 2-column grid, `thumbnailUrl` as poster, title below |
| Tag chips | Horizontal scrollable tag filters using `tags[]` |
| Player | Full-screen native video player via `expo-video` |
| Loading state | Skeleton placeholder cards |

---

## 4. Firebase Integration Strategy

### Listener Setup (inside `LeagueProvider`)

```ts
import { ref, onValue } from "firebase/database";
import { db } from "@/config/firebase"; // existing firebase config

const ROOT = "reycinUSA/works/league";

// Pattern for each collection:
const unsubLeagues = onValue(ref(db, `${ROOT}/leagues`), (snap) => {
  if (!snap.exists()) return setLeagues([]);
  const raw = snap.val();
  setLeagues(Object.entries(raw).map(([id, v]) => ({ ...(v as any), id })));
});

// Cleanup on unmount:
return () => {
  unsubLeagues();
  // ... all other unsubs
};
```

### Collections that use `onValue` (real-time)
- `leagues` — status can change (draft → active → archived)
- `events` — status changes (scheduled → live → completed)
- `media` — new videos uploaded frequently

### Collections that can use `get` (one-time on demand)
- `rules` — changes infrequently; load when Rules tab opened
- `hpClasses` — static per series season
- Individual `drivers`, `teams`, `vehicles` — load on profile open

### Firebase Push Key Normalization

Firebase RTDB returns objects keyed by push ID. Always normalize:
```ts
const toArray = <T>(val: Record<string, T> | null): (T & { id: string })[] => {
  if (!val) return [];
  return Object.entries(val).map(([id, item]) => ({ ...item, id }));
};
```

---

## 5. TypeScript Type Definitions

**File**: `expo/types/league.ts`

```ts
export interface League {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  status: "active" | "archived" | "draft";
  season: string;
  createdAt: number;
  updatedAt: number;
}

export interface Series {
  id: string;
  leagueId: string;
  name: string;
  description: string;
  schedule: string;
  rulesSummary: string;
  createdAt: number;
  updatedAt: number;
}

export interface HpClass {
  id: string;
  seriesId: string;
  label: string;
  minHp: number;
  maxHp: number;
  weightMin: number;
  additionalRules: string;
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  city: string;
  state: string;
  logoUrl: string;
  bio: string;
  createdAt: number;
  updatedAt: number;
}

export type LicenseClass = "novice" | "amateur" | "semi-pro" | "pro" | "elite";

export interface Driver {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  nickname: string;
  number: number;
  photoUrl: string;
  licenseClass: LicenseClass;
  bio: string;
  createdAt: number;
  updatedAt: number;
}

export interface Vehicle {
  id: string;
  teamId: string;
  seriesIds: string[];
  classId: string;
  make: string;
  model: string;
  year: number;
  hp: number;
  weight: number;
  photoUrl: string;
  chassisProgramId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EventResult {
  position: number;
  driverId: string;
  vehicleId: string;
  time: string;
  laps: number;
  dnf: boolean;
  penalty: string;
  points: number;
  polePosition?: boolean;
  fastestLap?: boolean;
  mostPositionsGained?: boolean;
  cleanRace?: boolean;
}

export type EventStatus = "scheduled" | "live" | "completed" | "cancelled";

export interface LeagueEvent {
  id: string;
  seriesId: string;
  name: string;
  date: string;
  location: string;
  trackId: string | null;
  posterUrl: string;
  status: EventStatus;
  results: EventResult[];
  createdAt: number;
  updatedAt: number;
}

export type RuleCategory = "technical" | "sporting" | "safety" | "administrative";

export interface Rule {
  id: string;
  seriesId: string;
  category: RuleCategory;
  title: string;
  body: string;
  version: number;
  effectiveDate: string;
  createdAt: number;
  updatedAt: number;
}

export type MediaType = "video" | "photo" | "logo" | "document";

export interface MediaItem {
  id: string;
  leagueId: string;
  type: MediaType;
  title: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
  uploadedAt: number;
}

// ── Computed standings types ──────────────────────────────────

export interface DriverStandingRow {
  driverId: string;
  driver: Driver;
  teamId: string;
  points: number;
  bonusPoints: number;
  wins: number;
  podiums: number;
  dnfs: number;
  rank: number;
}

export interface TeamStandingRow {
  teamId: string;
  team: Team;
  points: number;
  bonusPoints: number;
  wins: number;
  podiums: number;
  rank: number;
}
```

---

## 6. Standings Computation Logic

### 6.1 Driver Championship (ARC Scale)

```ts
const ARC_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function computeDriverStandings(
  events: LeagueEvent[],
  drivers: Driver[],
  seriesId: string
): DriverStandingRow[] {
  const completedEvents = events.filter(
    (e) => e.seriesId === seriesId && e.status === "completed"
  );

  const map = new Map<string, Omit<DriverStandingRow, "rank">>();

  for (const event of completedEvents) {
    for (const result of event.results ?? []) {
      const existing = map.get(result.driverId) ?? {
        driverId: result.driverId,
        driver: drivers.find((d) => d.id === result.driverId)!,
        teamId: drivers.find((d) => d.id === result.driverId)?.teamId ?? "",
        points: 0,
        bonusPoints: 0,
        wins: 0,
        podiums: 0,
        dnfs: 0,
      };

      const posPoints = result.dnf ? 0 : (ARC_POINTS[result.position - 1] ?? 0);
      const bonus =
        (result.polePosition ? 1 : 0) +
        (result.fastestLap ? 1 : 0) +
        (result.mostPositionsGained ? 1 : 0) +
        (result.cleanRace ? 1 : 0);

      existing.points += posPoints + bonus;
      existing.bonusPoints += bonus;
      if (!result.dnf && result.position === 1) existing.wins++;
      if (!result.dnf && result.position <= 3) existing.podiums++;
      if (result.dnf) existing.dnfs++;

      map.set(result.driverId, existing);
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
```

### 6.2 Mechanics Cup (Team Championship)

```ts
function computeTeamStandings(
  driverRows: DriverStandingRow[],
  events: LeagueEvent[],
  teams: Team[],
  drivers: Driver[],
  seriesId: string
): TeamStandingRow[] {
  // Step 1: aggregate driver points by team
  const map = new Map<string, Omit<TeamStandingRow, "rank">>();

  for (const row of driverRows) {
    const existing = map.get(row.teamId) ?? {
      teamId: row.teamId,
      team: teams.find((t) => t.id === row.teamId)!,
      points: 0,
      bonusPoints: 0,
      wins: 0,
      podiums: 0,
    };
    existing.points += row.points;
    existing.wins += row.wins;
    existing.podiums += row.podiums;
    map.set(row.teamId, existing);
  }

  // Step 2: per-event team bonuses
  const completedEvents = events.filter(
    (e) => e.seriesId === seriesId && e.status === "completed"
  );

  for (const event of completedEvents) {
    // group results by team
    const byTeam = new Map<string, EventResult[]>();
    for (const result of event.results ?? []) {
      const driver = drivers.find((d) => d.id === result.driverId);
      if (!driver) continue;
      const arr = byTeam.get(driver.teamId) ?? [];
      arr.push(result);
      byTeam.set(driver.teamId, arr);
    }

    for (const [teamId, results] of byTeam.entries()) {
      const entry = map.get(teamId);
      if (!entry) continue;

      let teamBonus = 0;
      const hasFastestLap = results.some((r) => r.fastestLap);
      const hasPole = results.some((r) => r.polePosition);
      const finishers = results.filter((r) => !r.dnf);
      const top10 = finishers.filter((r) => r.position <= 10);
      const allClean = results.length >= 1 && results.every((r) => r.cleanRace);

      if (hasFastestLap) teamBonus += 3;
      if (hasPole) teamBonus += 2;
      if (results.length >= 2 && top10.length >= 2) teamBonus += 5;
      if (results.length >= 2 && finishers.length === results.length) teamBonus += 3;
      if (allClean) teamBonus += 3;

      entry.points += teamBonus;
      entry.bonusPoints += teamBonus;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.points - a.points)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}
```

---

## 7. Component Structure

All shared components live in `expo/components/league/`.

### `LeagueHero`
Props: `{ league: League }`
- Full-width banner with `logoUrl` as background (tinted overlay)
- League name in large text, season chip in corner
- Status badge (ACTIVE / ARCHIVED)

### `SeriesCard`
Props: `{ series: Series; hpClasses: HpClass[]; onPress: () => void }`
- Series name, schedule text, HP class pills
- Chevron right icon

### `EventCard`
Props: `{ event: LeagueEvent; onPress?: () => void }`
- Poster image (aspect 16:9 rounded), event name, date formatted, location
- Status chip: `LIVE` (red pulse), `UPCOMING` (blue), `COMPLETED` (gray), `CANCELLED` (strikethrough)

### `ResultRow`
Props: `{ result: EventResult; driver: Driver; rank: number }`
- Medal emoji for top 3 (🥇🥈🥉), number for rest
- Driver name + car number
- Bonus icon strip (only icons for `true` flags)
- Points column, time column
- DNF styling: muted text, "DNF" in time cell

### `StandingsRow`
Props: `{ row: DriverStandingRow | TeamStandingRow; type: "driver" | "team" }`
- Rank number, photo/logo thumbnail
- Name, team name (for driver rows)
- Points total in bold
- "+N" bonus chip in accent color
- W / P / DNF counters in small muted text

### `BonusIcon`
Props: `{ type: "pole" | "fastest" | "positions" | "clean" }`
- Renders: 🏁 / ⚡ / 📈 / 🧹 with a tooltip label on long press

### `DriverCard`
Props: `{ driver: Driver; onPress?: () => void }`
- Circular photo, name, car number badge overlay
- License class color chip
- Tap → `DriverProfile`

### `VehicleCard`
Props: `{ vehicle: Vehicle; hpClass?: HpClass }`
- Photo, year/make/model headline
- HP + weight specs, HP class badge

### `RuleSection`
Props: `{ category: RuleCategory; rules: Rule[] }`
- Section header with category icon
- Expandable rule cards (title → full markdown body on expand)
- Version + effective date in footer

### `VideoThumbnailCard`
Props: `{ item: MediaItem; onPress: () => void }`
- Thumbnail image with play button overlay
- Title below, tag chips

### `ClassBadge`
Props: `{ label: string }`
- Small pill, dark background, white text, monospaced font

---

## 8. State Management Plan

### `LeagueProvider`
**File**: `expo/providers/LeagueProvider.tsx`

```ts
export const [LeagueProvider, useLeague] = createContextHook(() => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [hpClasses, setHpClasses] = useState<HpClass[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [events, setEvents] = useState<LeagueEvent[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // mount onValue listeners for all collections
    // return cleanup function that calls all unsubscribers
  }, []);

  return { leagues, series, hpClasses, teams, drivers, vehicles, events, rules, media, loading };
});
```

**Add to `expo/app/_layout.tsx`**:
```tsx
<LeagueProvider>
  {/* existing app content */}
</LeagueProvider>
```

### Computed Selector Hooks (co-located in `LeagueProvider.tsx`)

```ts
export function useSeriesByLeague(leagueId: string) {
  const { series } = useLeague();
  return useMemo(() => series.filter((s) => s.leagueId === leagueId), [series, leagueId]);
}

export function useSeriesEvents(seriesId: string) {
  const { events } = useLeague();
  return useMemo(() => events.filter((e) => e.seriesId === seriesId), [events, seriesId]);
}

export function useDriverStandings(seriesId: string): DriverStandingRow[] {
  const { events, drivers } = useLeague();
  return useMemo(() => computeDriverStandings(events, drivers, seriesId), [events, drivers, seriesId]);
}

export function useTeamStandings(seriesId: string): TeamStandingRow[] {
  const { events, drivers, teams } = useLeague();
  const driverRows = useDriverStandings(seriesId);
  return useMemo(
    () => computeTeamStandings(driverRows, events, teams, drivers, seriesId),
    [driverRows, events, teams, drivers, seriesId]
  );
}

export function useTeamDrivers(teamId: string) {
  const { drivers } = useLeague();
  return useMemo(() => drivers.filter((d) => d.teamId === teamId), [drivers, teamId]);
}

export function useTeamVehicles(teamId: string) {
  const { vehicles } = useLeague();
  return useMemo(() => vehicles.filter((v) => v.teamId === teamId), [vehicles, teamId]);
}
```

### Local Screen State (NOT persisted)

Each screen manages its own drill-down selection via `useState`:

```ts
// Inside LeagueScreen (the tab entry point)
type LeagueView =
  | { screen: "home" }
  | { screen: "series"; leagueId: string; seriesId: string }
  | { screen: "event"; eventId: string }
  | { screen: "team"; teamId: string }
  | { screen: "driver"; driverId: string }
  | { screen: "watch" };

const [view, setView] = useState<LeagueView>({ screen: "home" });
```

Back navigation handled by `setView` — no stack array needed for this depth.

---

## 9. Navigation Flow

```
LEAGUE sub-tab
│
├── LeagueHome
│    └── [tap league] → SeriesDetail
│         ├── [SCHEDULE tab]
│         │    └── EventCard → EventResults
│         ├── [STANDINGS tab]
│         │    ├── DriverStandings → DriverProfile
│         │    └── TeamStandings → TeamProfile → DriverProfile
│         └── [RULES tab]
│              └── RulesBrowser (expandable inline)
│
├── [Watch button in header] → WatchScreen
│
└── Back button → parent view (LeagueHome or SeriesDetail)
```

**Navigation pattern** — single `view` state with type union. Header renders a back `<` button whenever `view.screen !== "home"`. No Expo Router routes added.

---

## 10. File Structure

```
expo/
├── app/
│   └── (tabs)/
│       └── race/
│           └── league/
│               ├── LeagueScreen.tsx        ← Entry, manages view state
│               ├── LeagueHome.tsx          ← Phase 1
│               ├── SeriesDetail.tsx        ← Phase 1
│               ├── EventSchedule.tsx       ← Phase 1
│               ├── EventResults.tsx        ← Phase 2
│               ├── DriverStandings.tsx     ← Phase 2
│               ├── TeamStandings.tsx       ← Phase 2
│               ├── TeamProfile.tsx         ← Phase 3
│               ├── DriverProfile.tsx       ← Phase 3
│               ├── RulesBrowser.tsx        ← Phase 3
│               └── WatchScreen.tsx         ← Phase 3
├── components/
│   └── league/
│       ├── LeagueHero.tsx
│       ├── SeriesCard.tsx
│       ├── EventCard.tsx
│       ├── ResultRow.tsx
│       ├── StandingsRow.tsx
│       ├── BonusIcon.tsx
│       ├── DriverCard.tsx
│       ├── VehicleCard.tsx
│       ├── RuleSection.tsx
│       ├── VideoThumbnailCard.tsx
│       └── ClassBadge.tsx
├── providers/
│   └── LeagueProvider.tsx
└── types/
    └── league.ts
```

---

## 11. Firebase RTDB Index Rules

Add to your Firebase database rules JSON to support filtered queries:

```json
{
  "rules": {
    "reycinUSA": {
      "works": {
        "league": {
          "events":   { ".indexOn": ["seriesId", "status", "date"] },
          "series":   { ".indexOn": ["leagueId"] },
          "teams":    { ".indexOn": ["leagueId"] },
          "drivers":  { ".indexOn": ["teamId"] },
          "vehicles": { ".indexOn": ["teamId"] },
          "rules":    { ".indexOn": ["seriesId", "category"] },
          "media":    { ".indexOn": ["leagueId", "type", "uploadedAt"] },
          "hpClasses":{ ".indexOn": ["seriesId"] }
        }
      }
    }
  }
}
```

> Without these indexes, `orderByChild` queries will fall back to client-side filtering with a console warning.

---

## 12. Implementation Checklist

### Phase 1 — Foundation & Browse
- [x] `expo/types/league.ts` — all TypeScript interfaces + computation types
- [x] `expo/providers/LeagueProvider.tsx` — Firebase onValue listeners + selector hooks
- [x] Add `LeagueProvider` to `expo/app/_layout.tsx`
- [x] `expo/components/league/LeagueHero.tsx`
- [x] `expo/components/league/SeriesCard.tsx`
- [x] `expo/components/league/EventCard.tsx`
- [x] `expo/app/(tabs)/race/league/LeagueModule.tsx` — stack-based nav manager
- [x] `expo/app/(tabs)/race/league/LeagueHome.tsx`
- [x] `expo/app/(tabs)/race/league/SeriesDetail.tsx`
- [x] `expo/app/(tabs)/race/league/EventSchedule.tsx`
- [x] Add `"league"` to `RaceTab` type and `RACE_TABS` in `race/index.tsx`

### Phase 2 — Results & Standings
- [x] `expo/components/league/BonusIcon.tsx`
- [x] `expo/components/league/ResultRow.tsx`
- [x] `expo/components/league/StandingsRow.tsx`
- [x] `expo/app/(tabs)/race/league/EventResults.tsx`
- [x] `expo/app/(tabs)/race/league/DriverStandings.tsx` — tappable rows → DriverProfile
- [x] `expo/app/(tabs)/race/league/TeamStandings.tsx` — tappable rows → TeamProfile

### Phase 3 — Profiles, Rules & Media
- [x] `expo/components/league/DriverCard.tsx`
- [x] `expo/components/league/VehicleCard.tsx`
- [x] `expo/components/league/RuleSection.tsx`
- [x] `expo/components/league/VideoThumbnailCard.tsx`
- [x] `expo/app/(tabs)/race/league/TeamProfile.tsx`
- [x] `expo/app/(tabs)/race/league/DriverProfile.tsx`
- [x] `expo/app/(tabs)/race/league/RulesBrowser.tsx`
- [x] `expo/app/(tabs)/race/league/WatchScreen.tsx`

### Cross-cutting
- [ ] Firebase RTDB indexes added to database rules
- [x] Empty state placeholders on all screens
- [x] Web compatibility check (Linking.openURL for video — no native-only APIs)
- [x] Stack-based back navigation across all screens
