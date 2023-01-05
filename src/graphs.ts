import { StatsSummary } from './types';

// probably a better way to do this like `{ new(): BaseChart }`
export type GraphChartType = Function;
export type GraphOptions = {
  bucketTime: number
  groupId: string
}
export type GraphProcessor = (stat: StatsSummary, opts: GraphOptions) => any;

export type GraphData = {
  title: string
  type: string
  options: any
  groupBy: string
  filter?: (stat: StatsSummary) => boolean
  processor: GraphProcessor
}

const MACC_OPS = new Set(['matmul', 'conv2d']);

export const graphs: GraphData[] = [
  {
    title: 'Throughput by Host',
    type: 'line',
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'GFLOPS/sec',
          },
        }
      }
    },
    groupBy: 'hostId',
    processor: (stat: StatsSummary, { bucketTime }) => stat.totals.gflops/bucketTime*1e3,
  },
  {
    title: 'Throughput by Process/Device',
    type: 'line',
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'GFLOPS/sec',
          },
        }
      }
    },
    groupBy: 'id',
    processor: (stat: StatsSummary, { bucketTime }) => stat.totals.gflops/bucketTime*1e3,
  },
  {
    title: 'Throughput by Operation',
    type: 'line',
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'GFLOPS/sec',
          },
          stacked: true,
        }
      }
    },
    groupBy: 'op',
    filter: (stat: StatsSummary) => !MACC_OPS.has(stat.entriesByOp?.[0]?.[0]),
    processor: (stat: StatsSummary, { groupId, bucketTime }) => (stat.entriesByOp.find(([k]) => k === groupId)?.[1].gflops || 0)/bucketTime*1e3,
  },
  {
    title: 'Throughput by MACC Operation',
    type: 'line',
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'GFLOPS/sec',
          },
          stacked: true,
        }
      }
    },
    groupBy: 'op',
    filter: (stat: StatsSummary) => MACC_OPS.has(stat.entriesByOp?.[0]?.[0]),
    processor: (stat: StatsSummary, { groupId, bucketTime }) => (stat.entriesByOp.find(([k]) => k === groupId)?.[1].gflops || 0)/bucketTime*1e3,
  },
  {
    title: 'Utilization by Host',
    type: 'line',
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: '%',
          },
        }
      }
    },
    groupBy: 'hostId',
    processor: (stat: StatsSummary, { bucketTime }) => stat.utilization*100,
  },
  {
    title: 'Volume by Operation',
    type: 'bar',
    options: {
      scales: {
        y: {
          title: {
            display: true,
            text: 'Count',
          },
        }  
      }
    },
    groupBy: 'op',
    processor: (stat: StatsSummary, { groupId, bucketTime }) => (stat.entriesByOp.find(([k]) => k === groupId)?.[1].count || 0),
  },
  {
    title: 'Memory Usage by Host',
    type: 'line',
    options: {
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'MB',
          },
        }
      }
    },
    groupBy: 'hostId',
    processor: (stat: StatsSummary) => Number(stat.totals.bytes ? stat.totals.bytes/stat.totals.count / 1e6 : 0).toFixed(1),
  },
  {
    title: 'Time per 1000 Ops',
    type: 'bar',
    options: {
      scales: {
        y: {
          title: {
            display: true,
            text: 'ms',
          },
        }  
      }
    },
    groupBy: 'op',
    processor: (stat: StatsSummary, { groupId, bucketTime }) => {
      const entry = stat.entriesByOp.find(([k]) => k === groupId);
      if (!entry) return 0;
      return entry[1].time / entry[1].count;
    }
  },
]
