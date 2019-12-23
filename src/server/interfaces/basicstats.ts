import { Stats } from "./stats";
import History from "../history";

export interface BasicStats {
  id: string,
  stats: {
    active: boolean,
    mining: boolean,
    elected: boolean,
    syncing: boolean,
    hashrate: number,
    peers: number,
    gasPrice: number,
    uptime: number,
    latency: number
  }
}

export interface BasicStats2 {
  id: string,
  stats: Stats,
  history: number[]
}