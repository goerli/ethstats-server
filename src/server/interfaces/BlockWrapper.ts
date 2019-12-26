import { PropagationTime } from "./PropagationTime";
import { BlockData } from "./BlockData";

export interface BlockWrapper {
  height: number
  block: BlockData
  forks: BlockData[]
  propagTimes: PropagationTime[]
}