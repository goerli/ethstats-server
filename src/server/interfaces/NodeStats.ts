import { Stats } from "./Stats";

export interface NodeStats {
  id: string,
  stats: Stats
  history: number[]
}
