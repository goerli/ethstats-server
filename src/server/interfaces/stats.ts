import { Block } from "./block";
import { Info } from "./info";

export interface Stats {
  id?: string
  ip?: string
  spark?: string
  address?: string
  active?: boolean
  mining: boolean
  elected?: boolean
  hashrate: number
  peers: number
  pending: number
  gasPrice: number
  block: Block
  clientTime?: number
  // todo: o'rily?
  stats?: Stats
  info?: Info
  syncing: boolean
  propagationAvg: number
  latency: number
  uptime: number
  name?: string
  registered?: boolean
  signer?: string
}
