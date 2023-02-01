export type StatsEntry = {
  count: number
  time: number
  bytes: number
  gflops: number
}

export type StatsSummary = {
  id: string
  hostId: string
  processId: string
  deviceId: string
  hostDevice: string
  bytesUsed: number
  utilization: number
  startTime: number
  endTime: number
  totals: StatsEntry
  deviceRate: StatsEntry
  hostRate: StatsEntry
  stackKeys: [number, string][]
  entriesByStack: [number, StatsEntry][]
  entriesByOp: [string, StatsEntry][]
  remoteStats: StatsSummary[]
}

export type StatsBucket = {
  startTime: number
  endTime: number
  stats: StatsSummary[]
}
