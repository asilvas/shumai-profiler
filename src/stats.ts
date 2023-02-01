import type { StatsBucket, StatsSummary } from './types';

export function mergeStats(existingStat: StatsSummary, stat: StatsSummary): StatsSummary {
  existingStat.startTime = Math.min(stat.startTime, existingStat.startTime);
  existingStat.endTime = Math.max(stat.endTime, existingStat.endTime);
  existingStat.bytesUsed = Math.max(stat.bytesUsed, existingStat.bytesUsed);
  existingStat.utilization = Math.max(stat.utilization, existingStat.utilization);
  existingStat.totals.count += stat.totals.count;
  existingStat.totals.time += stat.totals.time;
  existingStat.totals.bytes += stat.totals.bytes;
  existingStat.totals.gflops += stat.totals.gflops;
  existingStat.deviceRate.count += stat.deviceRate.count;
  existingStat.deviceRate.time += stat.deviceRate.time;
  existingStat.deviceRate.bytes += stat.deviceRate.bytes;
  existingStat.deviceRate.gflops += stat.deviceRate.gflops;
  existingStat.hostRate.count += stat.hostRate.count;
  existingStat.hostRate.time += stat.hostRate.time;
  existingStat.hostRate.bytes += stat.hostRate.bytes;
  existingStat.hostRate.gflops += stat.hostRate.gflops;
  existingStat.stackKeys = existingStat.stackKeys.concat(stat.stackKeys); // this is currently more efficient than deduping

  // merge entriesByStack
  for (const [stackId, entry] of stat.entriesByStack) {
    const existingEntry = existingStat.entriesByStack.find(e => e[0] === stackId);
    if (existingEntry) {
      existingEntry[1].count += entry.count;
      existingEntry[1].time += entry.time;
      existingEntry[1].bytes += entry.bytes;
      existingEntry[1].gflops += entry.gflops;
    } else {
      existingStat.entriesByStack.push([stackId, entry]);
    }
  }

  // merge entriesByOp
  for (const [op, entry] of stat.entriesByOp) {
    const existingEntry = existingStat.entriesByOp.find(e => e[0] === op);
    if (existingEntry) {
      existingEntry[1].count += entry.count;
      existingEntry[1].time += entry.time;
      existingEntry[1].bytes += entry.bytes;
      existingEntry[1].gflops += entry.gflops;
    } else {
      existingStat.entriesByOp.push([op, entry]);
    }
  }
  
  return existingStat;
}

export function resetStatTotals(stat: StatsSummary): StatsSummary {
  const { startTime, endTime } = stat;

  // TODO: Would be good to export logic from shumai to avoid duplication of code: https://github.com/facebookresearch/shumai/blob/main/shumai/stats/stats.ts#L372

  // measure of host time is fixed to the first & last entry to avoid gaps of work skewing results
  // this fixed window of time allows for consistent rates to be computed even when serialized from multiple devices
  const hostSeconds = (endTime - startTime) / 1_000

  stat.totals = { count: 0, time: 0, bytes: 0, gflops: 0 };
  stat.hostRate = { count: 0, time: 0, bytes: 0, gflops: 0 };
  stat.deviceRate = { count: 0, time: 0, bytes: 0, gflops: 0 };

  for (const [, entry] of stat.entriesByOp) {
    stat.totals.count += entry.count;
    stat.totals.time += entry.time;
    stat.totals.bytes += entry.bytes;
    stat.totals.gflops += entry.gflops;
  }

  const seconds = stat.totals.time / 1_000

  // compute per second stats
  stat.deviceRate.count = seconds ? Math.round(Number(stat.totals.count) / seconds) : 0
  stat.deviceRate.time = hostSeconds ? stat.totals.time / hostSeconds : 1_000
  // deviceRate stats may result in loss due to type conversions
  stat.deviceRate.bytes = stat.totals.count
    ? stat.totals.bytes / stat.totals.count
    : 0
  stat.deviceRate.gflops = seconds ? Number(stat.totals.gflops) / seconds : 0

  // compute host rate stats (total wall clock compared to only device time)
  stat.hostRate.count = hostSeconds
    ? Math.round(Number(stat.totals.count) / hostSeconds)
    : 0
  stat.hostRate.time = stat.deviceRate.time
  // hostRate stats may result in loss due to type conversions
  stat.hostRate.bytes = stat.totals.count ? stat.totals.bytes / stat.totals.count : 0
  stat.hostRate.gflops = hostSeconds ? Number(stat.totals.gflops) / hostSeconds : 0

  return stat;
}

export function reduceStatsBy(buckets: StatsBucket[], groupName: string): StatsBucket[] {
  const result: StatsBucket[] = [];

  const isByOp = groupName === 'op';

  for (const bucket of buckets) {
    const statsBy: Map<string, StatsSummary> = new Map();

    for (const stat of bucket.stats) {
      const groupIds = isByOp ? stat.entriesByOp.map(([op]) => op) : [stat[groupName]];
      for (const groupId of groupIds) {
        const statToMerge: StatsSummary = isByOp ? resetStatTotals({ ...stat, entriesByStack: [], entriesByOp: [stat.entriesByOp.find(([k]) => k === groupId)] }) : stat;
        const existingStat = statsBy.get(groupId);
        if (existingStat) {
          mergeStats(existingStat, statToMerge);
        } else { // only clone once (if needed)
          statsBy.set(groupId, JSON.parse(JSON.stringify(isByOp ? statToMerge : statToMerge))); // might be worth pulling in a deep-clone package
        }
      }
    }

    result.push({
      startTime: bucket.startTime,
      endTime: bucket.endTime,
      stats: [...statsBy.values()],
    });
  }

  if (isByOp && result.length) {
    const b = result[result.length-1];
    const bucketTime = b.endTime - b.startTime;
    /*console.log('reduceStatsBy', groupName, 'ops/gflops/duration');
    console.log(b.stats
      .map(s => 
        s.entriesByOp.map(([op, entry]) => 
          op
        )
      ).flat())
    console.log(b.stats
      .map(s => 
        s.entriesByOp.map(([op, entry]) => 
          entry.gflops/bucketTime*1e3
        )
      ).flat())
      console.log(b.stats
        .map(s => 
          s.endTime-s.startTime
          ).flat()
        )*/
    }

  return result;
}

function addStatToBuckets(stat: StatsSummary, buckets: StatsBucket[], bucketTime: number, activeBucket: StatsBucket = void 0): StatsBucket {
  const now = Date.now();
  const startTime = now - (now % bucketTime);
  const minTime = startTime - bucketTime;
  const endTime = startTime + bucketTime;
  if (now > activeBucket?.endTime) {
    buckets.push(activeBucket);
    activeBucket = void 0; // reset
  }
  if (!activeBucket) { // initialize active bucket
    activeBucket = {
      startTime,
      endTime,
      stats: [],
    }
  }
  else if (now > endTime) { // active bucket has been completed
    buckets.push(activeBucket);
    activeBucket = {
      startTime,
      endTime,
      stats: [],
    }
  }

  let leftBucket = buckets[buckets.length - 1];
  if (!leftBucket || stat.startTime >= startTime) {
    // if no buckets yet OR stat is belongs entirely in the right bucket, add as-is
    activeBucket.stats.push(stat);
  } else if (stat.endTime < minTime) {
    // if stat is too far in the past, ignore it
  } else if (stat.endTime <= startTime) {
    // simply add to left bucket
    leftBucket.stats.push(stat);
  } else {
    // we must split the stat between left and right buckets
    const leftRatio = (startTime - stat.startTime) / (stat.endTime - stat.startTime);
    const [leftStat, rightStat] = splitStatByRatio(stat, leftRatio, startTime);
    leftBucket.stats.push(leftStat);
    activeBucket.stats.push(rightStat);
  }

  return activeBucket;
}

export function addStatsToBuckets(stats: StatsSummary[], buckets: StatsBucket[], bucketTime: number, activeBucket: StatsBucket = void 0): StatsBucket {
  for (let stat of stats) {
    activeBucket = addStatToBuckets(stat, buckets, bucketTime, activeBucket);
  }

  return activeBucket;
}

export function splitStatByRatio(stat: StatsSummary, leftRatio: number, leftEndTime: number): [StatsSummary, StatsSummary] {
  const leftStat: StatsSummary = {
    id: stat.id,
    hostId: stat.hostId,
    processId: stat.processId,
    deviceId: stat.deviceId,
    hostDevice: `${stat.hostId}:${stat.deviceId}`,
    startTime: Math.min(leftEndTime, stat.startTime),
    endTime: Math.min(leftEndTime, stat.endTime),
    bytesUsed: Math.floor(stat.bytesUsed * leftRatio),
    utilization: stat.utilization,
    totals: {
      count: Math.floor(stat.totals.count * leftRatio),
      time: stat.totals.time * leftRatio,
      bytes: Math.floor(stat.totals.bytes * leftRatio),
      gflops: stat.totals.gflops * leftRatio,
    },
    deviceRate: {
      count: Math.floor(stat.deviceRate.count * leftRatio),
      time: stat.deviceRate.time * leftRatio,
      bytes: Math.floor(stat.deviceRate.bytes * leftRatio),
      gflops: stat.deviceRate.gflops * leftRatio,
    },
    hostRate: {
      count: Math.floor(stat.hostRate.count * leftRatio),
      time: stat.hostRate.time * leftRatio,
      bytes: Math.floor(stat.hostRate.bytes * leftRatio),
      gflops: stat.hostRate.gflops * leftRatio,
    },
    entriesByStack: [],
    entriesByOp: [],
    remoteStats: [],
    stackKeys: stat.stackKeys,
  };
  const rightStat: StatsSummary = {
    id: stat.id,
    hostId: stat.hostId,
    processId: stat.processId,
    deviceId: stat.deviceId,
    hostDevice: `${stat.hostId}:${stat.deviceId}`,
    startTime: Math.max(leftEndTime, stat.startTime),
    endTime: Math.max(leftEndTime, stat.endTime),
    bytesUsed: stat.bytesUsed - leftStat.bytesUsed,
    utilization: stat.utilization,
    totals: {
      count: stat.totals.count - leftStat.totals.count,
      time: stat.totals.time - leftStat.totals.time,
      bytes: stat.totals.bytes - leftStat.totals.bytes,
      gflops: stat.totals.gflops - leftStat.totals.gflops
    },
    deviceRate: {
      count: stat.deviceRate.count - leftStat.deviceRate.count,
      time: stat.deviceRate.time - leftStat.deviceRate.time,
      bytes: stat.deviceRate.bytes - leftStat.deviceRate.bytes,
      gflops: stat.deviceRate.gflops - leftStat.deviceRate.gflops
    },
    hostRate: {
      count: stat.hostRate.count - leftStat.hostRate.count,
      time: stat.hostRate.time - leftStat.hostRate.time,
      bytes: stat.hostRate.bytes - leftStat.hostRate.bytes,
      gflops: stat.hostRate.gflops - leftStat.hostRate.gflops
    },
    entriesByStack: [],
    entriesByOp: [],
    remoteStats: [],
    stackKeys: stat.stackKeys,
  };

  stat.entriesByStack.forEach(([stackId, entry]) => {
    const leftEntry = {
      count: Math.floor(entry.count * leftRatio),
      time: entry.time * leftRatio,
      bytes: Math.floor(entry.bytes * leftRatio),
      gflops: entry.gflops * leftRatio,
    };
    const rightEntry = {
      count: entry.count - leftEntry.count,
      time: entry.time - leftEntry.time,
      bytes: entry.bytes - leftEntry.bytes,
      gflops: entry.gflops - leftEntry.gflops,
    };

    leftStat.entriesByStack.push([stackId, leftEntry]);
    rightStat.entriesByStack.push([stackId, rightEntry]);
  });

  stat.entriesByOp.forEach(([op, entry]) => {
    const leftEntry = {
      count: Math.floor(entry.count * leftRatio),
      time: entry.time * leftRatio,
      bytes: Math.floor(entry.bytes * leftRatio),
      gflops: entry.gflops * leftRatio,
    };
    const rightEntry = {
      count: entry.count - leftEntry.count,
      time: entry.time - leftEntry.time,
      bytes: entry.bytes - leftEntry.bytes,
      gflops: entry.gflops - leftEntry.gflops,
    };

    leftStat.entriesByOp.push([op, leftEntry]);
    rightStat.entriesByOp.push([op, rightEntry]);
  });

  // resetStatTotals(leftStat);
  // resetStatTotals(rightStat);

// console.log('splitStatByRatio', leftRatio, stat.endTime - stat.startTime, leftStat.endTime - leftStat.startTime, rightStat.endTime - rightStat.startTime);
  return [leftStat, rightStat];
}
