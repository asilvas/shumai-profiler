import { StatsSummary } from "~/types";

export const STATS_EXPIRATION = 1000 * 60 * 60; // 1hr

let STATS: StatsSummary[] = [];

export function getAllStats(): StatsSummary[] {
  return expireOldStats(STATS)
}

export function getStatsByDate(fromDate: number, toDate: number): StatsSummary[] {
  return getAllStats().filter((s) => s.startTime >= fromDate && s.startTime <= toDate)
}

function expireOldStats(stats: StatsSummary[]) {
  const expiredAt = Date.now() - STATS_EXPIRATION
  let i = 0
  for (i = 0; i < stats.length && stats[i].startTime < expiredAt; i++) {
  }

  if (i > 0) {
    stats = stats.slice(i);
  }

  return stats;
}

export function flattenStats(stats: StatsSummary[]): StatsSummary[] {
  return stats.reduce((acc, s) => {
    acc.push(s);
    acc = acc.concat(flattenStats(s.remoteStats));
    return acc;
  }, [] as StatsSummary[]);
}

export function addStats(stats: StatsSummary[]) {
  STATS = getAllStats().concat(flattenStats(stats))
}

export function clearStats() {
  STATS = []
}
