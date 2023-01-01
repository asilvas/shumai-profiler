import { createEffect, createSignal, onCleanup, createUniqueId } from "solid-js";
import type { GraphData  } from '~/graphs';
import type { StatsBucket } from '~/types';
import { Accordion } from 'solid-bootstrap';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';
import { reduceStatsBy } from '~/stats';

export type GraphOptions = {
  graph: GraphData
  bucketTime: number
  buckets: StatsBucket[]
}

export const GraphDefaultOptions = {
  responsive: true
}

export const Graph = (props: GraphOptions) => {
  const id = createUniqueId();

  const { graph } = props;
  const { groupBy, filter } = graph;

  const isStackedDefault = graph.options?.scales?.y?.stacked;

  let chart, chartRef;

  const [options, setOptions] = createSignal({ ...GraphDefaultOptions, ...graph.options });

  createEffect(() => {
    const isByOp = groupBy === 'op';
    const buckets = reduceStatsBy(props.buckets, groupBy);
    if (filter) {
      buckets.forEach(b => b.stats = b.stats.filter(filter));
    }
    const groups: string[] = [...buckets.reduce((acc, b) => {
      b.stats.forEach(s => {
        if (isByOp) {
          s.entriesByOp.forEach(([op]) => {
            acc.add(op);
          })
        } else {
          acc.add(s[groupBy]);
        }
      });
      return acc;
    }, new Set<string>())].sort();
    const labels = graph.type === 'line' ? buckets.map(b => new Date(b.startTime)) : [groupBy];
    const datasets = graph.type === 'line' ? groups.map(label => {
      return {
        label,
        cubicInterpolationMode: 'monotone',
        data: buckets.map(bucket => {
          const groupStat = isByOp ? bucket.stats.find(s => s.entriesByOp?.[0][0] === label) : bucket.stats.find(s => s[groupBy] === label);
          if (!groupStat) return void 0;

          // fetch computed stat
          return graph.processor(groupStat, { groupId: label, bucketTime: props.bucketTime });
        }),
      };
    }) : groups.map(label => {
      return {
        label,
        data: [buckets.reduce((acc, bucket) => {
          const groupStat = isByOp ? bucket.stats.find(s => s.entriesByOp?.[0][0] === label) : bucket.stats.find(s => s[groupBy] === label);
          if (!groupStat) return void 0;
  
          // fetch computed stat
          return acc + graph.processor(groupStat, { groupId: label, bucketTime: props.bucketTime });
        }, 0)]
      };
    });
    const data = {
      labels,
      datasets
    };
    if (groups.length) {
      // console.log(groups, data.datasets?.[0]?.data.map(v => typeof v !== 'number' ? v : v.toFixed(1)))
    }
    if (chart) {
      chart.data = data;
      chart.update('none')
    } else if (buckets.length > 0) {
      /* @ts-ignore */
      chart = new Chart(chartRef, { type: graph.type, data, options: options() });
    }
  });

  onCleanup(() => {
    chart?.destroy();
    chart = null;
  });

  const onClickChecked = (e: Event) => {
    const opts = options();
    opts.scales = opts.scales || {};
    opts.scales.y = opts.scales.y || {};
    opts.scales.y.stacked = (e.target as HTMLInputElement).checked;
    setOptions(opts);

    chart.options = opts;
    chart.update()
  };

  const optionsUI = (<div class="form-check">
    <input class="form-check-input" type="checkbox" value="" checked={isStackedDefault} id={`checkStacked${id}`} onClick={onClickChecked} />
    <label class="form-check-label" for={`checkStacked${id}`}>
      Stacked
    </label>
  </div>);

  return (
    <div class="col-sm-6">
      <Accordion defaultActiveKey="0">
        <Accordion.Item eventKey="0">
          <Accordion.Header><h2>{graph.title}</h2></Accordion.Header>
          <Accordion.Body>
            {optionsUI}
            <canvas ref={chartRef}></canvas>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>      
    </div>
  );
}