export type LeagueStatus = "active" | "archived" | "draft";
export type LicenseClass = "novice" | "amateur" | "semi-pro" | "pro" | "elite";
export type EventStatus = "scheduled" | "live" | "completed" | "cancelled";
export type RuleCategory = "technical" | "sporting" | "safety" | "administrative";
export type MediaType = "video" | "photo" | "logo" | "document";

export interface League {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  status: LeagueStatus;
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

export interface DriverStanding {
  driverId: string;
  points: number;
  bonusPoints: number;
  wins: number;
  podiums: number;
  dnfs: number;
}

export interface TeamStanding {
  teamId: string;
  points: number;
  bonusPoints: number;
  wins: number;
  podiums: number;
  dnfs: number;
}

export const ARC_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;

export function computeDriverStandings(
  events: LeagueEvent[],
  seriesId?: string
): DriverStanding[] {
  const completed = events.filter(
    (e) => e.status === "completed" && (!seriesId || e.seriesId === seriesId)
  );
  const map: Record<string, DriverStanding> = {};

  for (const event of completed) {
    for (const result of event.results ?? []) {
      if (!map[result.driverId]) {
        map[result.driverId] = {
          driverId: result.driverId,
          points: 0,
          bonusPoints: 0,
          wins: 0,
          podiums: 0,
          dnfs: 0,
        };
      }
      const s = map[result.driverId];
      const posPoints = result.dnf ? 0 : (ARC_POINTS[result.position - 1] ?? 0);
      const bonus =
        (result.polePosition ? 1 : 0) +
        (result.fastestLap ? 1 : 0) +
        (result.mostPositionsGained ? 1 : 0) +
        (result.cleanRace ? 1 : 0);
      s.points += posPoints + bonus;
      s.bonusPoints += bonus;
      if (result.position === 1 && !result.dnf) s.wins++;
      if (result.position <= 3 && !result.dnf) s.podiums++;
      if (result.dnf) s.dnfs++;
    }
  }

  return Object.values(map).sort((a, b) => b.points - a.points);
}

export function computeTeamStandings(
  events: LeagueEvent[],
  drivers: Record<string, Driver>,
  seriesId?: string
): TeamStanding[] {
  const driverStandings = computeDriverStandings(events, seriesId);
  const map: Record<string, TeamStanding> = {};

  for (const ds of driverStandings) {
    const driver = drivers[ds.driverId];
    if (!driver) continue;
    const tid = driver.teamId;
    if (!map[tid]) {
      map[tid] = { teamId: tid, points: 0, bonusPoints: 0, wins: 0, podiums: 0, dnfs: 0 };
    }
    map[tid].points += ds.points;
    map[tid].wins += ds.wins;
    map[tid].podiums += ds.podiums;
    map[tid].dnfs += ds.dnfs;
  }

  const completed = events.filter(
    (e) => e.status === "completed" && (!seriesId || e.seriesId === seriesId)
  );

  for (const event of completed) {
    const teamResults: Record<string, EventResult[]> = {};
    for (const result of event.results ?? []) {
      const driver = drivers[result.driverId];
      if (!driver) continue;
      const tid = driver.teamId;
      if (!teamResults[tid]) teamResults[tid] = [];
      teamResults[tid].push(result);
    }

    for (const [tid, results] of Object.entries(teamResults)) {
      if (!map[tid]) continue;
      let bonus = 0;
      if (results.some((r) => r.fastestLap)) bonus += 3;
      if (results.some((r) => r.polePosition)) bonus += 2;
      const top10 = results.filter((r) => !r.dnf && r.position <= 10).length;
      if (results.length >= 2 && top10 >= 2) bonus += 5;
      if (results.length >= 2 && results.every((r) => !r.dnf)) bonus += 3;
      if (results.every((r) => r.cleanRace)) bonus += 3;
      map[tid].points += bonus;
      map[tid].bonusPoints += bonus;
    }
  }

  return Object.values(map).sort((a, b) => b.points - a.points);
}
