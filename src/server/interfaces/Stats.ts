import { BasicStats } from "./BasicStats";
import { BlockData } from "./BlockData";
import { Info } from "./Info";

export interface Stats extends BasicStats {
  id?: string
  propagationAvg?: number
  name?: string
  registered?: boolean
  signer?: string
  pending: number
  block: BlockData
  clientTime?: number
  info?: Info
}
