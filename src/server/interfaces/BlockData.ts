import { Validators } from "./Validators";

export interface BlockData {
  number?: number
  hash?: string
  parentHash?: string
  miner?: string
  difficulty?: string
  totalDifficulty?: string
  gasLimit?: number
  gasUsed?: number
  timestamp?: number
  time?: number
  arrival?: number
  validators?: Validators
  received?: number
  trusted?: boolean
  arrived?: number
  fork?: number
  propagation?: number
  transactions?: any[]
  uncles?: any[]
}
