import { Stats } from "./stats";
import History from "../history";
import { Info } from "./info";

export interface NodeInfo {
  id: string,
  info: Info
  stats: Stats
  history: number[]
}
