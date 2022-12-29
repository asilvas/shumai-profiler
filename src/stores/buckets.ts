import { createStore } from "solid-js/store";
import { StatsBucket } from "~/types";

export const [buckets, setBuckets] = createStore<StatsBucket[]>([]);
