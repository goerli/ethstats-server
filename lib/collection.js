var _ = require('lodash');
var Blockchain = require('./history');
var Node = require('./node');

var Collection = function Collection(externalAPI) {
  this._items = [];
  this._blockchain = new Blockchain();
  this._debounced = null;
  this._externalAPI = externalAPI;
  this._highestBlock = 0;

  return this;
}

Collection.prototype.add = function (data, callback) {
  const node = this.getNodeOrNew({validatorData: {signer: data.id}}, data);
  node.setInfo(data, callback);
}

Collection.prototype.update = function (id, stats, callback) {
  var node = this.getNode({validatorData: {signer: id}});

  if (!node) {
    callback('Node not found', null);
  } else {
    var block = this._blockchain.add(stats.block, id, node.trusted);

    if (!block) {
      callback('Block data wrong', null);
    } else {
      var propagationHistory = this._blockchain.getNodePropagation(id);

      stats.block.arrived = block.block.arrived;
      stats.block.received = block.block.received;
      stats.block.propagation = block.block.propagation;

      node.setStats(stats, propagationHistory, callback);
    }
  }
}

Collection.prototype.addBlock = function (id, stats, callback) {
  const node = this.getNode({validatorData: {signer: id}});

  if (!node) {
    console.error(this._items.map(item=> console.log(item.validatorData.signer)))
    callback(`Node ${id} not found`, null);
  } else {

    var block = this._blockchain.add(stats, id, node.trusted);

    if (!block) {
      callback('Block undefined', null);
    } else {
      var propagationHistory = this._blockchain.getNodePropagation(id);

      stats.arrived = block.block.arrived;
      stats.received = block.block.received;
      stats.propagation = block.block.propagation;
      stats.validators = block.block.validators;
      
      if (block.block.number > this._highestBlock) {
        this._highestBlock = block.block.number;
        this._externalAPI.write({
          action: "lastBlock",
          number: this._highestBlock
        });
      }

      node.setBlock(stats, propagationHistory, callback);
    }
  }
}

Collection.prototype.updatePending = function (id, stats, callback) {
  var node = this.getNode({validatorData: {signer: id}});

  if (!node)
    return false;

  node.setPending(stats, callback);
}

Collection.prototype.updateStats = function (id, stats, callback) {
  var node = this.getNode({validatorData: {signer: id}});

  if (!node) {
    callback('Node not found', null);
  } else {
    node.setBasicStats(stats, callback);
  }
}

Collection.prototype.updateLatency = function (id, latency, callback) {
  var node = this.getNode({validatorData: {signer: id}});

  if (!node)
    return false;

  node.setLatency(latency, callback);
}

Collection.prototype.inactive = function (id, callback) {
  var node = this.getNode({ spark: id });

  if (!node) {
    callback('Node not found', null);
  } else {
    node.setState(false);
    callback(null, node.getStats());
  }
}

Collection.prototype.getIndex = function (search) {
  return _.findIndex(this._items, search);
}

Collection.prototype.getNode = function (search) {
  var index = this.getIndex(search);

  if (index >= 0)
    return this._items[index];

  return false;
}

Collection.prototype.getNodeByIndex = function (index) {
  if (this._items[index])
    return this._items[index];

  return false;
}

Collection.prototype.getIndexOrNew = function (search, data) {
  var index = this.getIndex(search);

  return (index >= 0 ? index : this._items.push(new Node(data)) - 1);
}

Collection.prototype.getNodeOrNew = function (search, data) {
  return this.getNodeByIndex(this.getIndexOrNew(search, data));
}

Collection.prototype.all = function () {
  this.removeOldNodes();

  return this._items;
}

Collection.prototype.removeOldNodes = function () {
  var deleteList = []

  for (var i = this._items.length - 1; i >= 0; i--) {
    if (this._items[i].isInactiveAndOld()) {
      deleteList.push(i);
    }
  }

  if (deleteList.length > 0) {
    for (var i = 0; i < deleteList.length; i++) {
      this._items.splice(deleteList[i], 1);
    }
  }
}

Collection.prototype.blockPropagationChart = function () {
  return this._blockchain.getBlockPropagation();
}

Collection.prototype.setChartsCallback = function (callback) {
  this._blockchain.setCallback(callback);
}

Collection.prototype.getCharts = function () {
  this.getChartsDebounced();
}

Collection.prototype.getChartsDebounced = function () {
  var self = this;

  if (this._debounced === null) {
    this._debounced = _.debounce(function () {
      self._blockchain.getCharts();
    }, 500, {
      leading: false,
      maxWait: 2000,
      trailing: true
    });
  }

  this._debounced();
}

module.exports = Collection;
