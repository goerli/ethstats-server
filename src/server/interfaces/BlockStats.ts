import { BlockData } from "./BlockData";

export interface BlockStats {
  id: string
  block: BlockData
  propagationAvg: number,
  history: number[]
}
