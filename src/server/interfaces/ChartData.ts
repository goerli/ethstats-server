import { Miner } from "./Miner";
import { Histogram } from "./Histogram";

export interface ChartData {
  height: number[]
  blocktime: number[]
  avgBlocktime: number
  difficulty: string[]
  uncles: number[]
  transactions: number[]
  gasSpending: number[]
  gasLimit: number[]
  miners: Miner[]
  propagation: Histogram
}