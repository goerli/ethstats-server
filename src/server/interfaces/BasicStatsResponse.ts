import { BasicStats } from "./BasicStats";

export interface BasicStatsResponse {
  id: string,
  stats: BasicStats,
  history?: number[]
}