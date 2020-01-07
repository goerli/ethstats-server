// @ts-ignore
import _ from 'lodash'
import History from "./history";
import Node from "./node"
// @ts-ignore
import * as Primus from "primus"
import { Stats } from "./interfaces/Stats";
import { Validator } from "./interfaces/Validator";
import { Pending } from "./interfaces/Pending";
import { Latency } from "./interfaces/Latency";
import { NodeInfo } from "./interfaces/NodeInfo";
import { ChartData } from "./interfaces/ChartData";
import { BlockStats } from "./interfaces/BlockStats";
import { BasicStatsResponse } from "./interfaces/BasicStatsResponse";
import { NodeStats } from "./interfaces/NodeStats";
import { BlockData } from "./interfaces/BlockData";
import { NodeInformation } from "./interfaces/NodeInformation";

export default class Collection {

  private nodes: Node[] = []
  private history: History = new History()
  private debounced: any = null
  // todo: refactor this outta here
  private externalAPI: Primus
  private highestBlock: number = 1

  constructor(
    externalAPI: Primus
  ) {
    this.externalAPI = externalAPI
  }

  public add(
    nodeInformation: NodeInformation,
    callback: { (err: Error | string, nodeInfo: NodeInfo): void | null }
  ) {
    const node: Node = this.getNodeOrNew(
      {validatorData: {signer: nodeInformation.stats.id}},
      nodeInformation
    )
    node.setInfo(
      nodeInformation,
      callback
    )
  }

  // todo: this is dead code!
  private update(
    stats: Stats,
    callback: { (err: Error | string, stats: NodeStats): void }
  ) {
    const node: Node = this.getNode({validatorData: {signer: stats.id}})

    if (!node) {
      callback('Node not found', null)
    } else {
      const block = this.history.add(stats.block, stats.id, node.trusted)

      if (!block) {
        callback('Block data wrong', null)
      } else {
        const propagationHistory: number[] = this.history.getNodePropagation(stats.id)

        stats.block.arrived = block.block.arrived
        stats.block.received = block.block.received
        stats.block.propagation = block.block.propagation

        node.setStats(
          stats,
          propagationHistory,
          callback
        )
      }
    }
  }

  public addBlock(
    id: string,
    block: BlockData,
    callback: { (err: Error | string, blockStats: BlockStats): void }
  ) {
    const node = this.getNode({validatorData: {signer: id}})

    if (!node) {
      console.error(this.nodes.map(item => console.log(item.validatorData.signer)))
      callback(`Node ${id} not found`, null)
    } else {

      const newBlock = this.history.add(block, id, node.trusted)

      if (!newBlock) {
        callback('Block undefined', null)
      } else {
        const propagationHistory: number[] = this.history.getNodePropagation(id)

        block.arrived = newBlock.block.arrived
        block.received = newBlock.block.received
        block.propagation = newBlock.block.propagation
        block.validators = newBlock.block.validators

        if (newBlock.block.number > this.highestBlock) {
          this.highestBlock = newBlock.block.number
          this.externalAPI.write({
            action: 'lastBlock',
            number: this.highestBlock
          })
        }

        node.setBlock(block, propagationHistory, callback)
      }
    }
  }

  public updatePending(
    id: string,
    stats: Stats,
    callback: { (err: Error | string, pending: Pending | null): void }
  ) {
    const node = this.getNode({validatorData: {signer: id}})

    if (!node)
      return false

    node.setPending(stats, callback)
  }

  public updateStats(
    id: string,
    stats: Stats,
    callback: { (err: Error | string, basicStats: BasicStatsResponse | null): void }
  ) {
    const node = this.getNode({validatorData: {signer: id}})

    if (!node) {
      callback('Node not found', null)
    } else {
      node.setBasicStats(stats, callback)
    }
  }

  public updateLatency(
    id: string,
    latency: number,
    callback: { (err: Error | string, latency: Latency): void }
  ) {
    const node = this.getNode({validatorData: {signer: id}})

    if (!node)
      return false

    node.setLatency(latency, callback)
  }

  public inactive(
    id: string,
    callback: { (err: Error | string, stats: NodeStats): void }
  ): void {
    const node = this.getNode({spark: id})

    if (!node) {
      callback('Node not found', null)
    } else {
      node.setState(false)
      callback(null, node.getStats())
    }
  }

  public getIndex(
    search: object
  ): number {
    return _.findIndex(this.nodes, search)
  }

  private getNode(
    search: object
  ): Node {
    const index = this.getIndex(search)

    if (index >= 0) {
      return this.nodes[index]
    }

    return null
  }

  private getNodeByIndex(
    index: number
  ): Node {
    if (this.nodes[index])
      return this.nodes[index]

    return
  }

  private getIndexOrNew(
    search: object,
    data: NodeInformation | Validator
  ): number {
    const index = this.getIndex(search)

    return (index >= 0 ? index : this.nodes.push(new Node(data)) - 1)
  }

  public getNodeOrNew(
    search: object,
    data: NodeInformation | Validator
  ): Node {
    return this.getNodeByIndex(this.getIndexOrNew(search, data))
  }

  public all() {
    this.removeOldNodes()

    return this.nodes
  }

  private removeOldNodes() {
    const deleteList = []

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.nodes[i].isInactiveAndOld()) {
        deleteList.push(i)
      }
    }

    if (deleteList.length > 0) {
      for (let i = 0; i < deleteList.length; i++) {
        this.nodes.splice(deleteList[i], 1)
      }
    }
  }

  // todo: this is dead code
  private blockPropagationChart() {
    return this.history.getBlockPropagation()
  }

  public setChartsCallback(
    callback: { (err: Error | string, chartData: ChartData): void }
  ) {
    this.history.setCallback(callback)
  }

  public getCharts() {
    this.getChartsDebounced()
  }

  private getChartsDebounced() {

    if (this.debounced === null) {
      this.debounced = _.debounce(() => {
        this.history.getCharts()
      }, 500, {
        leading: false,
        maxWait: 2000,
        trailing: true
      })
    }

    this.debounced()
  }
}
