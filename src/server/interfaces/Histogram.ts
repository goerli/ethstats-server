import { HistogramEntry } from "./HistogramEntry";

export interface Histogram {
  histogram: HistogramEntry[]
  avg: number
}