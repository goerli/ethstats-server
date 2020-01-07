// @ts-ignore
import _ from 'lodash'
import { trusted } from "./utils/config"
// @ts-ignore
import { Stats } from "./interfaces/Stats";
import { BlockData } from "./interfaces/BlockData";
import { Validator } from "./interfaces/Validator";
import { Pending } from "./interfaces/Pending";
import { NodeInfo } from "./interfaces/NodeInfo"
import { BasicStatsResponse } from "./interfaces/BasicStatsResponse";
import { Latency } from "./interfaces/Latency";
import { BlockStats } from "./interfaces/BlockStats";
import { Info } from "./interfaces/Info";
import { Uptime } from "./interfaces/Uptime";
import { NodeStats } from "./interfaces/NodeStats";
import { NodeDetails } from "./interfaces/NodeDetails";
import { NodeInformation } from "./interfaces/NodeInformation";

const MAX_HISTORY = 40
const MAX_INACTIVE_TIME = 1000 * 60 * 60 * 4

export default class Node {

  private id: string = null
  private spark: string
  private address: string = null

  private info: Info = {
    canUpdateHistory: false,
    name: null,
    contact: null
  } as Info

  private stats: Stats = {
    active: false,
    mining: false,
    elected: false,
    hashrate: 0,
    peers: 0,
    pending: 0,
    gasPrice: 0,
    block: {
      number: 0,
      hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      difficulty: '0',
      totalDifficulty: '0',
      gasLimit: 0,
      timestamp: 0,
      time: 0,
      validators: {
        registered: [],
        elected: []
      },
      arrival: 0,
      received: 0,
      propagation: 0,
      transactions: [],
      uncles: []
    },
    syncing: false,
    propagationAvg: 0,
    latency: 0,
    uptime: 100
  }
  private propagationHistory: number[] = []
  private uptime: Uptime = {
    started: 0,
    up: 0,
    down: 0,
    lastStatus: false,
    lastUpdate: 0
  }

  public name: string = null
  public validatorData: Validator = {
    name: null,
    url: null,
    address: null,
    affiliation: null,
    registered: false,
    elected: false,
    signer: null
  }
  public trusted: boolean = false

  constructor(
    data: NodeInformation | Validator
  ) {

    if ("registered" in data) {
      this.setValidatorData(data as Validator)
    } else {
      this.init(data as NodeInformation)
    }

    if ('nodeData' in data) {
      this.address = data.nodeData.address
    }
  }

  public init(
    nodeInformation: NodeInformation
  ) {
    _.fill(this.propagationHistory, -1)

    if (this.id === null && this.uptime.started === null) {
      this.setState(true)
    }

    this.id = _.result(nodeInformation.nodeData, 'id', this.id)
    this.spark = nodeInformation.nodeData.spark

    if (!_.isUndefined(nodeInformation.nodeData.latency)) {
      this.stats.latency = nodeInformation.nodeData.latency
    }

    this.setInfo(nodeInformation, null)
  }

  public setInfo(
    nodeInformation: NodeInformation,
    callback: { (err: Error | string, nodeInfo: NodeInfo): void | null }
  ) {
    if (!_.isUndefined(nodeInformation.stats.info)) {
      this.info = nodeInformation.stats.info

      if (!_.isUndefined(nodeInformation.stats.info.canUpdateHistory)) {
        this.info.canUpdateHistory = _.result(nodeInformation.stats, 'info.canUpdateHistory', false)
      }
    }

    if (!_.isUndefined(nodeInformation.nodeData.ip)) {
      if (trusted.indexOf(nodeInformation.nodeData.ip) >= 0) {
        this.trusted = true
      }
      this.trusted = true
    }

    this.setState(true)
    this.validatorData.signer = this.id

    if (callback) {
      callback(null, this.getInfo())
    }
  }

  public setValidatorData(data: Validator) {
    this.info.name = data.name || data.address
    this.info.contact = data.address
    this.trusted = true
    this.validatorData.signer = data.signer
    this.id = data.address
    this.address = data.address
  }

  public setStats(
    stats: Stats,
    history: number[],
    callback: { (err: Error | string, stats: NodeStats): void }
  ) {
    if (!_.isUndefined(stats)) {

      const block = _.result(stats, 'block', this.stats.block)
      this.setBlock(block, history, () => {
      })

      this.setBasicStats(stats, () => {
      })

      const pending = _.result(stats, 'pending', this.stats.pending)

      if (pending) {
        this.setPending(stats, () => {
        })
      }

      callback(null, this.getStats())
    }

    callback('Stats undefined', null)
  }

  public setBlock(
    block: BlockData,
    propagationHistory: number[],
    callback: { (err: Error | string, blockStats: BlockStats): void }
  ) {
    if (!_.isUndefined(block) && !_.isUndefined(block.number)) {

      if (
        !_.isEqual(propagationHistory, this.propagationHistory) ||
        !_.isEqual(block, this.stats.block)
      ) {
        if (
          block.number !== this.stats.block.number ||
          block.hash !== this.stats.block.hash
        ) {
          if (!block.validators.registered) {
            block.validators = this.stats.block.validators
          }

          this.stats.block = block
        }

        this.setPropagationHistory(propagationHistory)

        callback(null, this.getBlockStats())
      } else {
        callback(null, null)
      }
    } else {
      callback('Block undefined', null)
    }
  }

  public setPending(
    stats: Stats,
    callback: { (err: Error | string, pending: Pending | null): void }
  ) {
    if (!_.isUndefined(stats) && !_.isUndefined(stats.pending)) {
      if (!_.isEqual(stats.pending, this.stats.pending)) {
        this.stats.pending = stats.pending

        callback(null, {
          id: this.id,
          pending: this.stats.pending
        })
      } else {
        callback(null, null)
      }
    } else {
      callback('Stats undefined', null)
    }
  }

  public setBasicStats(
    stats: Stats,
    callback: { (err: Error | string, basicStats: BasicStatsResponse | null): void }
  ) {
    if (!_.isUndefined(stats)) {
      if (!_.isEqual(stats, {
        active: this.stats.active,
        mining: this.stats.mining,
        elected: this.stats.elected,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        uptime: this.stats.uptime
      })) {
        this.stats.active = stats.active
        this.stats.mining = stats.mining
        this.stats.elected = stats.elected
        this.stats.syncing = (!_.isUndefined(stats.syncing) ? stats.syncing : false)
        this.stats.hashrate = stats.hashrate
        this.stats.peers = stats.peers
        this.stats.gasPrice = stats.gasPrice
        this.stats.uptime = stats.uptime

        callback(null, this.getBasicStats())
      } else {
        callback(null, null)
      }
    } else {
      callback('Stats undefined', null)
    }
  }

  public setLatency(
    latency: number,
    callback: { (err: Error | string, latency: Latency): void }
  ) {
    if (!_.isUndefined(latency)) {
      if (!_.isEqual(latency, this.stats.latency)) {
        this.stats.latency = latency

        callback(null, {
          id: this.id,
          latency: latency
        })
      } else {
        callback(null, null)
      }
    } else {
      callback('Latency undefined', null)
    }
  }

  public setState(
    active: boolean
  ) {
    const now = _.now()

    if (this.uptime.started !== null) {
      if (this.uptime.lastStatus === active) {
        this.uptime[(active ? 'up' : 'down')] += now - this.uptime.lastUpdate
      } else {
        this.uptime[(active ? 'down' : 'up')] += now - this.uptime.lastUpdate
      }
    } else {
      this.uptime.started = now
    }

    this.stats.active = active
    this.uptime.lastStatus = active
    this.uptime.lastUpdate = now

    this.stats.uptime = this.calculateUptime()
  }

  public isInactiveAndOld() {
    return (
      !this.uptime.lastStatus &&
      this.uptime.lastUpdate !== null &&
      (_.now() - this.uptime.lastUpdate) > MAX_INACTIVE_TIME
    )
  }

  public getStats(): NodeStats {
    return {
      id: this.id,
      stats: {
        active: this.stats.active,
        mining: this.stats.mining,
        syncing: this.stats.syncing,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        block: this.stats.block,
        propagationAvg: this.stats.propagationAvg,
        uptime: this.stats.uptime,
        pending: this.stats.pending,
        latency: this.stats.latency
      },
      history: this.propagationHistory
    }
  }

  private getBlockStats(): BlockStats {
    return {
      id: this.id,
      block: this.stats.block,
      propagationAvg: this.stats.propagationAvg,
      history: this.propagationHistory
    }
  }

  private getBasicStats(): BasicStatsResponse {
    return {
      id: this.id,
      stats: {
        active: this.stats.active,
        mining: this.stats.mining,
        elected: this.stats.elected,
        syncing: this.stats.syncing,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        uptime: this.stats.uptime,
        latency: this.stats.latency
      }
    }
  }

  private getInfo(): NodeDetails {
    return {
      id: this.id,
      info: this.info,
      stats: {
        active: this.stats.active,
        mining: this.stats.mining,
        syncing: this.stats.syncing,
        hashrate: this.stats.hashrate,
        peers: this.stats.peers,
        gasPrice: this.stats.gasPrice,
        block: this.stats.block,
        propagationAvg: this.stats.propagationAvg,
        uptime: this.stats.uptime,
        latency: this.stats.latency,
        pending: this.stats.pending,
      },
      history: this.propagationHistory,
    }
  }

  private calculateUptime() {
    if (this.uptime.lastUpdate === this.uptime.started) {
      return 100
    }

    return Math.round(this.uptime.up / (this.uptime.lastUpdate - this.uptime.started) * 100)
  }

  private setPropagationHistory(
    propagationHistory: number[]
  ) {
    // anything new?
    if (_.isEqual(propagationHistory, this.propagationHistory)) {
      // no, nothing to set
      return false
    }

    if (!propagationHistory) {
      this.propagationHistory = [].fill(-1, 0, MAX_HISTORY)
      this.stats.propagationAvg = 0

      return true
    }

    this.propagationHistory = propagationHistory

    const positives = _.filter(
      this.propagationHistory,
      (p: number) => {
        return p >= 0
      })

    this.stats.propagationAvg = (positives.length > 0 ? Math.round(_.sum(positives) / positives.length) : 0)

    return true
  }
}
