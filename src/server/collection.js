const _ = require('lodash')
const Blockchain = require('./history')
const Node = require('./node')

class Collection {
  constructor (externalAPI) {
    this._items = []
    this._blockchain = new Blockchain()
    this._debounced = null
    this._externalAPI = externalAPI
    this._highestBlock = 0

    return this
  }

  add (data, callback) {
    const node = this.getNodeOrNew({ validatorData: { signer: data.id } }, data)
    node.setInfo(data, callback)
  }

  update (id, stats, callback) {
    const node = this.getNode({ validatorData: { signer: id } })

    if (!node) {
      callback('Node not found', null)
    } else {
      const block = this._blockchain.add(stats.block, id, node.trusted)

      if (!block) {
        callback('Block data wrong', null)
      } else {
        const propagationHistory = this._blockchain.getNodePropagation(id)

        stats.block.arrived = block.block.arrived
        stats.block.received = block.block.received
        stats.block.propagation = block.block.propagation

        node.setStats(stats, propagationHistory, callback)
      }
    }
  }

  addBlock (id, stats, callback) {
    const node = this.getNode({ validatorData: { signer: id } })

    if (!node) {
      console.error(this._items.map(item => console.log(item.validatorData.signer)))
      callback(`Node ${id} not found`, null)
    } else {

      const block = this._blockchain.add(stats, id, node.trusted)

      if (!block) {
        callback('Block undefined', null)
      } else {
        const propagationHistory = this._blockchain.getNodePropagation(id)

        stats.arrived = block.block.arrived
        stats.received = block.block.received
        stats.propagation = block.block.propagation
        stats.validators = block.block.validators

        if (block.block.number > this._highestBlock) {
          this._highestBlock = block.block.number
          this._externalAPI.write({
            action: 'lastBlock',
            number: this._highestBlock
          })
        }

        node.setBlock(stats, propagationHistory, callback)
      }
    }
  }

  updatePending (id, stats, callback) {
    const node = this.getNode({ validatorData: { signer: id } })

    if (!node)
      return false

    node.setPending(stats, callback)
  }

  updateStats (id, stats, callback) {
    const node = this.getNode({ validatorData: { signer: id } })

    if (!node) {
      callback('Node not found', null)
    } else {
      node.setBasicStats(stats, callback)
    }
  }

  updateLatency (id, latency, callback) {
    const node = this.getNode({ validatorData: { signer: id } })

    if (!node)
      return false

    node.setLatency(latency, callback)
  }

  inactive (id, callback) {
    const node = this.getNode({ spark: id })

    if (!node) {
      callback('Node not found', null)
    } else {
      node.setState(false)
      callback(null, node.getStats())
    }
  }

  getIndex (search) {
    return _.findIndex(this._items, search)
  }

  getNode (search) {
    const index = this.getIndex(search)

    if (index >= 0)
      return this._items[index]

    return false
  }

  getNodeByIndex (index) {
    if (this._items[index])
      return this._items[index]

    return false
  }

  getIndexOrNew (search, data) {
    const index = this.getIndex(search)

    return (index >= 0 ? index : this._items.push(new Node(data)) - 1)
  }

  getNodeOrNew (search, data) {
    return this.getNodeByIndex(this.getIndexOrNew(search, data))
  }

  all () {
    this.removeOldNodes()

    return this._items
  }

  removeOldNodes () {
    const deleteList = []

    for (let i = this._items.length - 1; i >= 0; i--) {
      if (this._items[i].isInactiveAndOld()) {
        deleteList.push(i)
      }
    }

    if (deleteList.length > 0) {
      for (let i = 0; i < deleteList.length; i++) {
        this._items.splice(deleteList[i], 1)
      }
    }
  }

  blockPropagationChart () {
    return this._blockchain.getBlockPropagation()
  }

  setChartsCallback (callback) {
    this._blockchain.setCallback(callback)
  }

  getCharts () {
    this.getChartsDebounced()
  }

  getChartsDebounced () {
    const self = this

    if (this._debounced === null) {
      this._debounced = _.debounce(function () {
        self._blockchain.getCharts()
      }, 500, {
        leading: false,
        maxWait: 2000,
        trailing: true
      })
    }

    this._debounced()
  }
}

module.exports = Collection
