import { Proof } from "./Proof";
import { NodePing } from "./NodePing";

export interface NodeResponsePing {
  proof: Proof
  stats: NodePing
}

