import { createStore } from "solid-js/store";
import { StatsSummary } from "~/types";

export const [stats, setStats] = createStore<StatsSummary[]>([]);
