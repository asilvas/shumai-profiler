import { createMemo, onMount, onCleanup, createSignal, For, Show, createUniqueId, createEffect } from "solid-js";
import { produce } from "solid-js/store";
import { useRouteData } from "solid-start";
import server$, {
  createServerData$,
} from "solid-start/server";
import { getAllStats, getStatsByDate } from "~/server/stats";
import { graphs } from "~/graphs";
import { Graph } from '~/components/graph';
import { addStatsToBuckets } from '~/stats';
import type { StatsSummary, StatsBucket } from '~/types';
import 'bootstrap-icons/font/bootstrap-icons.css';

const DEFAULT_BUCKET_TIME = 5 * 1000;
const TIME_BUCKETS = 24; // 24x10s = 4 minutes

const getNewStats = server$(async (fromDate?: number, toDate?: number) => {
  return fromDate ? getStatsByDate(fromDate, toDate) : getAllStats()
});

export function routeData () {
  return createServerData$(() => getStatsByDate(Date.now() - DEFAULT_BUCKET_TIME, Date.now()), { initialValue: [] });
}

const App = () => {
  const id = createUniqueId();
  const statsReader = useRouteData<typeof routeData>();
  const [isRunning, setIsRunning] = createSignal(true);
  const [bucketTime, setBucketTime] = createSignal(DEFAULT_BUCKET_TIME);
  let b = []  
  const stats = statsReader();
  const [lastStatTime, setLastStatTime] = createSignal(stats[stats.length - 1]?.endTime || 0);
  const [activeBucket, setActiveBucket] = createSignal<StatsBucket>(addStatsToBuckets(stats, b, DEFAULT_BUCKET_TIME));
  const [buckets, setBuckets] = createSignal<StatsBucket[]>(b, { equals: false });
  const [updateTimer, setUpdateTimer] = createSignal(setInterval(async () => {
    if (!isRunning()) return;

    const latest = await getNewStats(lastStatTime(), Date.now());
    if (!latest.length) return;

    const highestTime = latest.reduce((acc, s) => Math.max(acc, s.startTime), 0);
    setLastStatTime(highestTime);
    const firstTime = buckets()[0]?.startTime || Date.now();
    const lastTime = buckets()[buckets().length - 1]?.endTime || Date.now();
    setActiveBucket(addStatsToBuckets(latest, buckets(), bucketTime(), activeBucket()));
    if (buckets().length > TIME_BUCKETS) {
      buckets().shift(); // remove the oldest bucket
    }
    if ((buckets()[0]?.startTime || 0) !== firstTime || (buckets()[buckets().length - 1]?.endTime) !== lastTime) {
      setBuckets(buckets()); // only signal buckets if there was a change
    }
  }, 1_000));

  onCleanup(() => {
    if (updateTimer()) {
      clearInterval(updateTimer());
      setUpdateTimer(null);
    }
  })

  const onClickReset = () => {
    setBuckets([]);
  };

  const toggleRunState = () => {
    setIsRunning(!isRunning());
  };

  return (
    <section class="container-fluid">
      <header class="header fixed-top bg-info bg-gradient bg-opacity-75">
        <div class="row px-3">
          <div class="col-11">
            <h1>shumai-profiler</h1>
          </div>
          <div class="col-1 text-end">
            <input type="checkbox" class="btn-check" id={`reset-${id}`} autocomplete="off" onClick={onClickReset} />
            <label class="btn btn-primary mt-2 mx-1" for={`reset-${id}`}><i class="bi-eraser-fill"></i></label>
            <input type="checkbox" class="btn-check" id={`run-state-${id}`} autocomplete="off" onClick={toggleRunState} />
            <label class="btn btn-primary mt-2 mx-1" for={`run-state-${id}`}><i class={isRunning() ? 'bi-pause-circle-fill' : 'bi-play-circle-fill'}></i></label>
          </div>
        </div>
      </header>

      <div class="row" style="padding-top:80px">
        <For each={graphs}>
          {(graph) => (<Graph graph={graph} bucketTime={bucketTime()} buckets={buckets()} />)}
        </For>
      </div>
    </section>
  );
};

export default App;
