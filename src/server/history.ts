import * as _ from "lodash"
import * as d3 from "d3"

const MAX_HISTORY = 2000
const MAX_PEER_PROPAGATION = 40
const MIN_PROPAGATION_RANGE = 0
const MAX_PROPAGATION_RANGE = 10000

const MAX_BINS = 40

export default class History {

  _items = []
  _callback = null

  add(block, id, trusted, addingHistory = false) {
    let changed = false

    if (!_.isUndefined(block) &&
      !_.isUndefined(block.number) &&
      !_.isUndefined(block.uncles) &&
      !_.isUndefined(block.transactions) &&
      !_.isUndefined(block.difficulty) &&
      block.number >= 0) {
      trusted = (process.env.LITE === 'true' ? true : trusted)

      const historyBlock = this.search(block.number)
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
        forkIndex = this.compareForks(historyBlock, block)

        if (propIndex === -1) {
          // Node didn't submit this block before
          if (forkIndex >= 0 && !_.isUndefined(historyBlock.forks[forkIndex])) {
            // Found fork => update data
            block.arrived = historyBlock.forks[forkIndex].arrived
            block.propagation = now - historyBlock.forks[forkIndex].received
          } else {
            // No fork found => add a new one
            const prevBlock = this.prevMaxBlock()

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
              historyBlock.propagTimes[propIndex].propagation = block.propagation = now - historyBlock.forks[forkIndex].received
            }

          } else {
            // No matching fork found => replace old one
            block.received = historyBlock.propagTimes[propIndex].received
            block.propagation = historyBlock.propagTimes[propIndex].propagation

            const prevBlock = this.prevMaxBlock()

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
        }

        if (trusted && !this.compareBlocks(historyBlock.block, historyBlock.forks[forkIndex])) {
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

        const item = {
          height: block.number,
          block: block,
          forks: [block],
          propagTimes: []
        }

        if (
          this._items.length === 0
          || (
          this._items.length > 0
          && block.number > this.worstBlockNumber())
          || (
          this._items.length < MAX_HISTORY
          && block.number < this.bestBlockNumber()
          && addingHistory)) {
          item.propagTimes.push({
            node: id,
            trusted: trusted,
            fork: 0,
            received: now,
            propagation: block.propagation
          })

          this._save(item)

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

  compareBlocks(block1, block2) {
    return !(block1.hash !== block2.hash ||
      block1.parentHash !== block2.parentHash ||
      block1.miner !== block2.miner ||
      block1.difficulty !== block2.difficulty ||
      block1.totalDifficulty !== block2.totalDifficulty)
  }

  compareForks(historyBlock, block2) {
    if (_.isUndefined(historyBlock))
      return -1

    if (_.isUndefined(historyBlock.forks) || historyBlock.forks.length === 0)
      return -1

    for (let x = 0; x < historyBlock.forks.length; x++)
      if (this.compareBlocks(historyBlock.forks[x], block2))
        return x

    return -1
  }

  _save(block) {
    this._items.unshift(block)

    this._items = _.sortBy(this._items, 'height', false).reverse()

    if (this._items.length > MAX_HISTORY) {
      this._items.pop()
    }
  }

  clean(max) {
    if (max > 0 && this._items.length > 0 && max < this.bestBlockNumber()) {
      console.log('MAX:', max)

      console.log('History items before:', this._items.length)

      this._items = _(this._items).filter(function (item) {
        return (item.height <= max && item.block.trusted === false)
      }).value()

      console.log('History items after:', this._items.length)
    }
  }

  search(number) {
    const index = _.findIndex(this._items, {height: number})

    if (index < 0)
      return false

    return this._items[index]
  }

  prevMaxBlock() {
    const heights = this._items.map(item => item.height)
    const index = heights.indexOf(Math.max(...heights))

    if (index < 0)
      return false

    return this._items[index]
  }

  bestBlock() {
    return _.maxBy(this._items, 'height')
  }

  bestBlockNumber() {
    const best = this.bestBlock()

    if (!_.isUndefined(best) && !_.isUndefined(best.height))
      return best.height

    return 0
  }

  worstBlock() {
    return _.minBy(this._items, 'height')
  }

  worstBlockNumber() {
    const worst = this.worstBlock()

    if (!_.isUndefined(worst) && !_.isUndefined(worst.height))
      return worst.height

    return 0
  }

  getNodePropagation(id) {
    return this._items
      .slice(0, MAX_PEER_PROPAGATION)
      .map(item => {
        const matches = item.propagTimes.filter(item => item.node === id)
        if (matches.length > 0)
          return matches[0].propagation
        return -1
      })
  }

  getBlockPropagation() {
    const propagation = []
    let avgPropagation = 0

    _.forEach(this._items, function (n) {
      _.forEach(n.propagTimes, function (p) {
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
    const histogram = data.map(function (val) {
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

  getAvgBlocktime() {
    const blockTimes = _(this._items)
      .sortBy('height', false)
      .reverse()
      .map(function (item) {
        return item.block.time / 1000
      })
      .value()

    return _.sum(blockTimes) / (blockTimes.length === 0 ? 1 : blockTimes.length)
  }

  getMinersCount() {
    return _(this._items)
      .sortBy('height', false)
      .reverse()
      .slice(0, MAX_BINS)
      .map(function (item) {
        return {
          miner: item.block.miner,
          number: item.block.number
        }
      })
      .value()
  }

  setCallback(callback) {
    this._callback = callback
  }

  getCharts() {
    if (this._callback !== null) {
      const chartHistory = _(this._items)
        .sortBy('height', false)
        .reverse()
        .slice(0, MAX_BINS)
        .map(function (item) {
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
      const padArray = function (arr, len, fill) {
        return arr.concat(Array(len).fill(fill)).slice(0, len)
      }

      this._callback(null, {
        height: _.map(chartHistory, 'height'),
        blocktime: padArray(_.map(chartHistory, 'blocktime'), MAX_BINS, 0),
        avgBlocktime: this.getAvgBlocktime(),
        difficulty: _.map(chartHistory, 'difficulty'),
        uncles: _.map(chartHistory, 'uncles'),
        transactions: _.map(chartHistory, 'transactions'),
        gasSpending: padArray(_.map(chartHistory, 'gasSpending'), MAX_BINS, 0),
        gasLimit: padArray(_.map(chartHistory, 'gasLimit'), MAX_BINS, 0),
        miners: this.getMinersCount(),
        propagation: this.getBlockPropagation(),
      })
    }
  }

}
