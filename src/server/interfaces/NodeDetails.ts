import { Stats } from "./Stats";
import { Info } from "./Info";

export interface NodeDetails {
  id: string,
  stats: Stats
  info: Info
  history: number[]
}
