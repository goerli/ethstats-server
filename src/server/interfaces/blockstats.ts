import { Block } from "./block";

export interface BlockStats {
  id: string
  block: Block
  propagationAvg: number,
  history: number[]
}