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
          display: false,
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
    title: 'Throughput by Host/Device',
    type: 'line',
    options: {
      scales: {
        x: {
          display: false,
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
    groupBy: 'hostDevice',
    processor: (stat: StatsSummary, { bucketTime }) => stat.totals.gflops/bucketTime*1e3,
  },
  {
    title: 'Throughput by Operation',
    type: 'line',
    options: {
      scales: {
        x: {
          display: false,
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
          display: false,
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
    title: 'Utilization by Host/Device',
    type: 'line',
    options: {
      scales: {
        x: {
          display: false,
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
    groupBy: 'hostDevice',
    processor: (stat: StatsSummary, { bucketTime }) => stat.utilization*100,
  },
  {
    title: 'Memory Usage by Host/Device',
    type: 'line',
    options: {
      scales: {
        x: {
          display: false,
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
    groupBy: 'hostDevice',
    processor: (stat: StatsSummary) => Number(stat.bytesUsed / 1e6).toFixed(2),
  },
  {
    title: 'Operation Rate/s',
    type: 'line',
    options: {
      responsive: true,
      plugins: {
        legend: true,
      },
      scales: {
        x: {
          display: false,
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Count',
          },
          stacked: true,
        }  
      }
    },
    groupBy: 'op',
    processor: (stat: StatsSummary, { groupId, bucketTime }) => (stat.entriesByOp.find(([k]) => k === groupId)?.[1].count || 0) / bucketTime * 1e3,
  },
  {
    title: 'Avg Flops per Operation by Host/Device',
    type: 'line',
    options: {
      scales: {
        x: {
          display: false,
          type: 'time',
          time: {
            unit: 'second'
          }
        },
        y: {
          title: {
            display: true,
            text: 'FLOPS/op/sec',
          },
        }
      }
    },
    groupBy: 'hostDevice',
    processor: (stat: StatsSummary, { bucketTime }) => (stat.totals.gflops / stat.totals.count) * 1e6,
  },
  {
    title: 'Volume by Operation',
    type: 'bar',
    options: {
      responsive: true,
      plugins: {
        legend: false,
      },
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
    title: 'Time per 1000 Ops',
    type: 'bar',
    options: {
      responsive: true,
      plugins: {
        legend: false,
      },
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
  {
    title: 'Time per Operation',
    type: 'bar',
    options: {
      responsive: true,
      plugins: {
        legend: false,
      },
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
      return entry[1].time;
    }
  },
]
