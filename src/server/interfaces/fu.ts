export interface fu {
  x: number
  dx: number
  y: number
  frequency: number
  cumulative: number
  cumpercent: number
}

export interface fa {
  histogram: fu[]
  avg: number
}

export interface Miner {
  miner: string;
  number: number
}