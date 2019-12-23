// @ts-ignore
import _ from 'lodash'
import { trusted } from "./utils/config"
// @ts-ignore
import { Stats } from "./interfaces/stats";
import { Block } from "./interfaces/block";
import { Validator } from "./interfaces/validator";
import { Pending } from "./interfaces/pending";
import { NodeInfo } from "./interfaces/nodeinfo"
import { BasicStats, BasicStats2 } from "./interfaces/basicstats";
import { Latency } from "./interfaces/latency";
import { BlockStats } from "./interfaces/blockstats";
import { Info } from "./interfaces/info";
import { Uptime } from "./interfaces/uptime";

const MAX_HISTORY = 40
const MAX_INACTIVE_TIME = 1000 * 60 * 60 * 4

export default class Node {

  private id: string = null
  private address: string = null

  private info: Info = {
    canUpdateHistory: false,
    name: null,
    contact: null
  }
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
      height: 0,
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

  constructor(data: Stats | Validator) {

    if (!data.registered) {
      this.init(data as Stats)
    } else {
      this.setValidatorData(data as Validator)
    }

    if (!!data.address) {
      this.address = data.address
    }
  }

  public init(stats: Stats) {
    _.fill(this.propagationHistory, -1)

    if (this.id === null && this.uptime.started === null) {
      this.setState(true)
    }

    this.id = _.result(stats, 'id', this.id)

    if (!_.isUndefined(stats.latency))
      this.stats.latency = stats.latency

    this.setInfo(stats, null)
  }

  public setInfo(
    stats: Stats,
    callback: { (err: Error | string, info: NodeInfo): void | null }
  ) {
    if (!_.isUndefined(stats.info)) {
      this.info = stats.info

      if (!_.isUndefined(stats.info.canUpdateHistory)) {
        this.info.canUpdateHistory = _.result(stats, 'info.canUpdateHistory', false)
      }
    }

    if (!_.isUndefined(stats.ip)) {
      if (trusted.indexOf(stats.ip) >= 0 || process.env.LITE === 'true') {
        this.trusted = true
      }
      this.trusted = true
    }

    this.setState(true)
    this.validatorData.signer = this.id

    if (callback !== null) {
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
    callback: { (err: Error | string, stats: BasicStats2): void }
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
    block: Block,
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
    callback: { (err: Error | string, basicStats: BasicStats | null): void }
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

  public getStats(): BasicStats2 {
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

  private getBasicStats(): BasicStats {
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

  private getInfo(): NodeInfo {
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

    if (!_.isArray(propagationHistory)) {
      this.propagationHistory = [].fill(-1, 0, MAX_HISTORY)
      this.stats.propagationAvg = 0

      return true
    }

    this.propagationHistory = propagationHistory

    const positives = _.filter(this.propagationHistory, function (p: number) {
      return p >= 0
    })

    this.stats.propagationAvg = (positives.length > 0 ? Math.round(_.sum(positives) / positives.length) : 0)

    return true
  }
}
