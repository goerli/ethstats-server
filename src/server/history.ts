// @ts-ignore
import _ from "lodash"
// @ts-ignore
import * as d3 from "d3"
import { Block } from "./interfaces/block";
import { PropagTime } from "./interfaces/propagtime";
import { ChartData } from "./interfaces/chartdata";
import { fa, fu, Miner } from "./interfaces/fu";

const MAX_HISTORY = 2000
const MAX_PEER_PROPAGATION = 40
const MIN_PROPAGATION_RANGE = 0
const MAX_PROPAGATION_RANGE = 10000
const MAX_BINS = 40

export default class History {

  private blocks: Block[] = []
  private callback: { (err: Error | string, chartData: ChartData): void } = null

  add(block: Block, id: string, trusted: boolean, addingHistory = false) {
    let changed = false

    if (
      !_.isUndefined(block) &&
      !_.isUndefined(block.number) &&
      !_.isUndefined(block.uncles) &&
      !_.isUndefined(block.transactions) &&
      !_.isUndefined(block.difficulty) &&
      block.number >= 0
    ) {
      trusted = (process.env.LITE === 'true' ? true : trusted)

      const historyBlock: Block = this.search(block.number)
      let forkIndex = -1

      const now = _.now()

      block.trusted = trusted
      block.arrived = now
      block.received = now
      block.propagation = 0
      block.fork = 0

      if (historyBlock) {
        // We already have a block with this height in collection

        // Check if node already checked this block height
        const propIndex = _.findIndex(historyBlock.propagTimes, {node: id})

        // Check if node already check a fork with this height
        forkIndex = History.compareForks(historyBlock, block)

        if (propIndex === -1) {
          // Node didn't submit this block before
          if (forkIndex >= 0 && !_.isUndefined(historyBlock.forks[forkIndex])) {
            // Found fork => update data
            block.arrived = historyBlock.forks[forkIndex].arrived
            block.propagation = now - historyBlock.forks[forkIndex].received
          } else {
            // No fork found => add a new one
            const prevBlock: Block = this.prevMaxBlock()

            if (prevBlock) {
              block.time = Math.max(block.arrived - prevBlock.block.arrived, 0)

              if (block.number < this.bestBlock().height)
                block.time = Math.max((block.timestamp - prevBlock.block.timestamp) * 1000, 0)
            } else {
              block.time = 0
            }

            forkIndex = historyBlock.forks.push(block) - 1
            historyBlock.forks[forkIndex].fork = forkIndex
          }

          // Push propagation time
          historyBlock.propagTimes.push({
            node: id,
            trusted: trusted,
            fork: forkIndex,
            received: now,
            propagation: block.propagation
          })
        } else {
          // Node submited the block before
          if (forkIndex >= 0 && !_.isUndefined(historyBlock.forks[forkIndex])) {
            // Matching fork found => update data
            block.arrived = historyBlock.forks[forkIndex].arrived

            if (forkIndex === historyBlock.propagTimes[propIndex].fork) {
              // Fork index is the same
              block.received = historyBlock.propagTimes[propIndex].received
              block.propagation = historyBlock.propagTimes[propIndex].propagation
            } else {
              // Fork index is different
              historyBlock.propagTimes[propIndex].fork = forkIndex
              historyBlock.propagTimes[propIndex].propagation =
                block.propagation = now - historyBlock.forks[forkIndex].received
            }

          } else {
            // No matching fork found => replace old one
            block.received = historyBlock.propagTimes[propIndex].received
            block.propagation = historyBlock.propagTimes[propIndex].propagation

            const prevBlock = this.prevMaxBlock()

            if (prevBlock) {
              block.time = Math.max(block.arrived - prevBlock.block.arrived, 0)

              if (block.number < this.bestBlock().height) {
                block.time = Math.max((block.timestamp - prevBlock.block.timestamp) * 1000, 0)
              }
            } else {
              block.time = 0
            }

            forkIndex = historyBlock.forks.push(block) - 1
            historyBlock.forks[forkIndex].fork = forkIndex
          }
        }

        if (trusted && !History.compareBlocks(historyBlock.block, historyBlock.forks[forkIndex])) {
          // If source is trusted update the main block
          historyBlock.forks[forkIndex].trusted = trusted
          historyBlock.block = historyBlock.forks[forkIndex]
        }

        block.fork = forkIndex

        changed = true

      } else {
        // Couldn't find block with this height

        // Getting previous max block
        const prevBlock = this.prevMaxBlock()

        if (prevBlock) {
          block.time = Math.max(block.arrived - prevBlock.block.arrived, 0)

          if (block.number < this.bestBlock().height)
            block.time = Math.max((block.timestamp - prevBlock.block.timestamp) * 1000, 0)
        } else {
          block.time = 0
        }

        const item: Block = {
          height: block.number,
          block: block,
          forks: [block],
          propagTimes: Array<PropagTime>()
        }

        if (
          this.blocks.length === 0 ||
          (
            this.blocks.length > 0 && block.number > this.worstBlockNumber()
          ) ||
          (
            this.blocks.length < MAX_HISTORY &&
            block.number < this.bestBlockNumber() &&
            addingHistory
          )
        ) {
          item.propagTimes.push({
            node: id,
            trusted: trusted,
            fork: 0,
            received: now,
            propagation: block.propagation
          })

          this.save(item)

          changed = true
        }
      }

      return {
        block: block,
        changed: changed
      }
    }

    return false
  }

  static compareBlocks(block1: Block, block2: Block) {
    return !(block1.hash !== block2.hash ||
      block1.parentHash !== block2.parentHash ||
      block1.miner !== block2.miner ||
      block1.difficulty !== block2.difficulty ||
      block1.totalDifficulty !== block2.totalDifficulty)
  }

  static compareForks(historyBlock: Block, block2: Block) {
    if (_.isUndefined(historyBlock))
      return -1

    if (_.isUndefined(historyBlock.forks) || historyBlock.forks.length === 0)
      return -1

    for (let x = 0; x < historyBlock.forks.length; x++)
      if (History.compareBlocks(historyBlock.forks[x], block2))
        return x

    return -1
  }

  private save(block: Block) {
    this.blocks
      .unshift(block)

    this.blocks = this.blocks.sort(
      (block1, block2) => block1.height - block2.height
    )

    if (this.blocks.length > MAX_HISTORY) {
      delete (this.blocks[this.blocks.length - 1])
      this.blocks.pop()
    }
  }

  clean(max: number): void {
    if (max > 0 && this.blocks.length > 0 && max < this.bestBlockNumber()) {
      console.log('MAX:', max)

      console.log('History items before:', this.blocks.length)

      this.blocks = _(this.blocks)
        .filter(function (item: Block) {
          return (item.height <= max && item.block.trusted === false)
        })
        .value()

      console.log('History items after:', this.blocks.length)
    }
  }

  search(number: number): Block {
    const index = _.findIndex(this.blocks, {height: number})

    if (index < 0)
      return null

    return this.blocks[index]
  }

  prevMaxBlock(): Block {
    const heights = this.blocks.map(item => item.height)
    const index = heights.indexOf(Math.max(...heights))

    if (index < 0)
      return null

    return this.blocks[index]
  }

  bestBlock(): Block {
    return _.maxBy(this.blocks, 'height')
  }

  bestBlockNumber(): number {
    const best: Block = this.bestBlock()

    if (!_.isUndefined(best) && !_.isUndefined(best.height))
      return best.height

    return 0
  }

  worstBlock(): Block {
    return _.minBy(this.blocks, 'height')
  }

  worstBlockNumber() {
    const worst = this.worstBlock()

    if (!_.isUndefined(worst) && !_.isUndefined(worst.height))
      return worst.height

    return 0
  }

  getNodePropagation(id: string): number[] {
    return this.blocks
      .slice(0, MAX_PEER_PROPAGATION)
      .map((item: Block) => {
        const matches = item.propagTimes.filter((item: PropagTime) => item.node === id)
        if (matches.length > 0)
          return matches[0].propagation
        return -1
      })
  }

  getBlockPropagation(): fa {
    const propagation: number[] = []
    let avgPropagation: number = 0

    _.forEach(this.blocks, function (n: Block) {
      _.forEach(n.propagTimes, function (p: PropagTime) {
        const prop = Math.min(MAX_PROPAGATION_RANGE, _.result(p, 'propagation', -1))

        if (prop >= 0)
          propagation.push(prop)
      })
    })

    if (propagation.length > 0) {
      avgPropagation = Math.round(_.sum(propagation) / propagation.length)
    }

    const data = d3.histogram()
      .domain([MIN_PROPAGATION_RANGE, MAX_PROPAGATION_RANGE])
      .thresholds(MAX_BINS)
      (propagation)

    let freqCum = 0

    const histogram = data.map((val: any): fu => {
      freqCum += val.length

      const cumPercent = (freqCum / Math.max(1, propagation.length))
      const y = val.length / propagation.length

      return {
        x: val.x0,
        dx: val.x1 - val.x0,
        y: isNaN(y) ? 0 : y,
        frequency: val.length,
        cumulative: freqCum,
        cumpercent: cumPercent
      }
    })

    return {
      histogram: histogram,
      avg: avgPropagation
    }
  }

  getAvgBlocktime(): number {
    const blockTimes = _(this.blocks)
      .sortBy('height',)
      .reverse()
      .toArray()
      .map((item: Block): number => {
        return item.block.time / 1000
      })
      .value()

    return _.sum(blockTimes) / (blockTimes.length === 0 ? 1 : blockTimes.length)
  }

  getMinersCount(): Miner[] {
    return _(this.blocks)
      .sortBy('height')
      .reverse()
      .slice(0, MAX_BINS)
      .map((item: Block): Miner => {
        return {
          miner: item.block.miner,
          number: item.block.number
        }
      })
      .value()
  }

  setCallback(
    callback: { (err: Error | string, chartData: ChartData): void }
  ) {
    this.callback = callback
  }

  static padArray(
    arr: any[],
    len: number,
    fill: any
  ): number[] {
    return arr.concat(Array(len).fill(fill)).slice(0, len)
  }

  getCharts(): void {
    if (this.callback !== null) {

      const chartHistory = _(this.blocks)
        .sortBy('height')
        .reverse()
        .slice(0, MAX_BINS)
        .toArray()
        .map((item: Block): {
          height: number
          blocktime: number
          difficulty: string
          uncles: number
          transactions: number
          gasSpending: number
          gasLimit: number
          miner: string
        } => {
          return {
            height: item.height,
            blocktime: item.block.time / 1000,
            difficulty: item.block.difficulty,
            uncles: item.block.uncles.length,
            transactions: item.block.transactions ? item.block.transactions.length : 0,
            gasSpending: item.block.gasUsed,
            gasLimit: item.block.gasLimit,
            miner: item.block.miner
          }
        })
        .value()

      this.callback(null, {
        height: _.map(chartHistory, 'height'),
        blocktime: History.padArray(_.map(chartHistory, 'blocktime'), MAX_BINS, 0),
        avgBlocktime: this.getAvgBlocktime(),
        difficulty: _.map(chartHistory, 'difficulty'),
        uncles: _.map(chartHistory, 'uncles'),
        transactions: _.map(chartHistory, 'transactions'),
        gasSpending: History.padArray(_.map(chartHistory, 'gasSpending'), MAX_BINS, 0),
        gasLimit: History.padArray(_.map(chartHistory, 'gasLimit'), MAX_BINS, 0),
        miners: this.getMinersCount(),
        propagation: this.getBlockPropagation(),
      })
    }
  }

}
