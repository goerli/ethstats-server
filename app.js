var _ = require('lodash');
const { Keccak } = require('sha3');
const EC = require('elliptic').ec;
var logger = require('./lib/utils/logger');
var chalk = require('chalk');
var http = require('http');

let banned = require('./lib/utils/config').banned;
let reserved = require('./lib/utils/config').reserved;
let trusted = require('./lib/utils/config').trusted

if (process.env.TRUSTED_NODE) {
  trusted.push(process.env.TRUSTED_NODE)
}

// Init http server
if (process.env.NODE_ENV !== 'production') {
  var app = require('./lib/express');
  server = http.createServer(app);
} else
  server = http.createServer();

// Init socket vars
var Primus = require('primus');
var api;
var client;
var server;


// Init API Socket connection
api = new Primus(server, {
  transformer: 'websockets',
  pathname: '/api',
  parser: 'JSON'
});

api.plugin('emit', require('primus-emit'));
api.plugin('spark-latency', require('primus-spark-latency'));


// Init Client Socket connection
client = new Primus(server, {
  transformer: 'websockets',
  pathname: '/primus',
  parser: 'JSON'
});

client.plugin('emit', require('primus-emit'));


// Init external API
external = new Primus(server, {
  transformer: 'websockets',
  pathname: '/external',
  parser: 'JSON'
});

external.plugin('emit', require('primus-emit'));

// Init collections
var Collection = require('./lib/collection');
var Nodes = new Collection(external);

Nodes.setChartsCallback(function (err, charts) {
  if (err !== null) {
    console.error('COL', 'CHR', 'Charts error:', err);
  } else {
    client.write({
      action: 'charts',
      data: charts
    });
  }
});

const authorize = (proof, stats) => {
  let isAuthorized = false
  if (!_.isUndefined(proof)
    && !_.isUndefined(proof.publicKey)
    && !_.isUndefined(proof.signature)
    && !_.isUndefined(stats)
    && !_.isUndefined(stats.id)
    && reserved.indexOf(stats.id) < 0
    && trusted.map(address => address.toLowerCase()).indexOf(proof.address) >= 0
  ) {
    const hasher = new Keccak(256)
    hasher.update(JSON.stringify(stats))
    const msgHash = hasher.digest('hex')
    const ec = new EC('secp256k1')
    const pubkeyNoZeroX = proof.publicKey.substr(2)
    let pubkey
    try {
      pubkey = ec.keyFromPublic(pubkeyNoZeroX, 'hex')
    } catch (e) {
      console.error('API', 'SIG', 'Public Key Error', e.message)
      return false
    }
    const addressHasher = new Keccak(256)
    addressHasher.update(pubkeyNoZeroX.substr(2), 'hex')
    const addressHash = addressHasher.digest("hex").substr(24)
    if (!(addressHash.toLowerCase() === proof.address.substr(2).toLowerCase())) {
      console.error('API', 'SIG', 'Address hash did not match', addressHash, proof.address.substr(2))
    }
    const signature = {
      r: proof.signature.substr(2, 64),
      s: proof.signature.substr(66, 64)
    }
    if (!(msgHash === proof.msgHash.substr(2))) {
      console.error('API', 'SIG', 'Message hash did not match', msgHash, proof.msgHash.substr(2))
      return false
    }
    try {
      isAuthorized = pubkey.verify(msgHash, signature)
      if (!isAuthorized) {
        throw new Error("Signature did not verify")
      }
    } catch (e) {
      console.error('API', 'SIG', 'Signature Error', e.message)
      return false
    }
  }
  if (!isAuthorized) {
    console.error('API', 'SIG', 'Not authorized')
  }
  return isAuthorized
}


// Init API Socket events
api.on('connection', function (spark) {
  console.info('API', 'CON', 'Open:', spark.address.ip);

  spark.on('hello', function (data) {
    const { stats, proof } = data
    if (banned.indexOf(spark.address.ip) >= 0
      || !authorize(proof, stats)) {
      spark.end(undefined, { reconnect: false });
      console.error('API', 'CON', 'Closed - wrong auth', data);
      return false;
    }
    console.info('API', 'CON', 'Hello', stats.id);

    if (!_.isUndefined(stats.info)) {
      stats.ip = spark.address.ip
      stats.id = proof.address
      stats.address = proof.address
      stats.spark = spark.id
      stats.latency = spark.latency || 0;

      Nodes.add(stats, function (err, info) {
        if (err !== null) {
          console.error('API', 'CON', 'Connection error:', err);
          return false;
        }

        if (info !== null) {
          spark.emit('ready');

          console.success('API', 'CON', 'Connected', stats.id);
          
          client.write({
            action: 'add',
            data: info
          });
        }
      });
    }
  });


  spark.on('update', function (data) {
    if (!_.isUndefined(data.id) && !_.isUndefined(data.stats)) {
      Nodes.update(data.id, data.stats, function (err, stats) {
        if (err !== null) {
          console.error('API', 'UPD', 'Update error:', err);
        } else {
          if (stats !== null) {
            client.write({
              action: 'update',
              data: stats
            });

            console.info('API', 'UPD', 'Update from:', data.id, 'for:', stats);

            Nodes.getCharts();
          }
        }
      });
    } else {
      console.error('API', 'UPD', 'Update error:', data);
    }
  });


  spark.on('block', function (data) {
    const { stats, proof } = data
    if (authorize(proof, stats)
      && !_.isUndefined(stats.block)) {
      stats.id = proof.address
      if (stats.block.validators && stats.block.validators.registered) {
        stats.block.validators.registered.forEach(validator => {
          validator.registered = true
          trusted.push(validator.address)
          const node = Nodes.getNodeOrNew({ id: validator.address }, validator)
          // TODO: only if new node
          node.setValidatorData(validator)
          return node.name
        })
      }

      Nodes.addBlock(stats.id, stats.block, function (err, stats) {
        if (err !== null) {
          console.error('API', 'BLK', 'Block error:', err);
        } else {
          if (stats !== null) {
            client.write({
              action: 'block',
              data: stats
            });

            console.success('API', 'BLK',
              'Block:', stats.block['number'],
              'td:', stats.block['totalDifficulty'],
              'from:', stats.id, 'ip:', spark.address.ip);

            Nodes.getCharts();
          }
        }
      });
    } else {
      console.error('API', 'BLK', 'Block error:', data);
    }
  });


  spark.on('pending', function (data) {
    const { stats, proof } = data
    if (authorize(proof, stats)
      && !_.isUndefined(stats.stats)) {
      stats.id = proof.address
      Nodes.updatePending(stats.id, stats.stats, function (err, pending) {
        if (err !== null) {
          console.error('API', 'TXS', 'Pending error:', err);
        }

        if (pending !== null) {
          client.write({
            action: 'pending',
            data: pending
          });

          console.success('API', 'TXS', 'Pending:', pending['pending'], 'from:', pending.id);
        }
      });
    } else {
      console.error('API', 'TXS', 'Pending error:', data);
    }
  });


  spark.on('stats', function (data) {
    const { stats, proof } = data
    if (authorize(proof, stats)
      && !_.isUndefined(stats.stats)) {
      stats.id = proof.address
      Nodes.updateStats(stats.id, stats.stats, function (err, stats) {
        if (err !== null) {
          console.error('API', 'STA', 'Stats error:', err);
        } else {
          if (stats !== null) {
            client.write({
              action: 'stats',
              data: stats
            });

            console.success('API', 'STA', 'Stats from:', stats.id);
          }
        }
      });
    }
  });


  spark.on('history', function (data) {
    const { stats, proof } = data
    if (authorize(proof, stats)) {
      console.success('API', 'HIS', 'Got history from:', stats.id);
      stats.id = proof.address
      var time = chalk.reset.cyan((new Date()).toJSON()) + " ";
      console.time(time, 'COL', 'CHR', 'Got charts in');
      // Nodes.addHistory(stats.id, stats.history, function (err, history) {
      //   console.timeEnd(time, 'COL', 'CHR', 'Got charts in');
      //   if (err !== null) {
      //     console.error('COL', 'CHR', 'History error:', err);
      //   } else {
      //     client.write({
      //       action: 'charts',
      //       data: history
      //     });
      //   }
      // });
    }
  });


  spark.on('node-ping', function (data) {
    const { stats, proof } = data
    if (authorize(proof, stats)) {
      stats.id = proof.address
      const start = (!_.isUndefined(stats.clientTime) ? stats.clientTime : null);

      spark.emit('node-pong', {
        clientTime: start,
        serverTime: _.now()
      });

      console.success('API', 'PIN', 'Ping from:', stats.id);
    }
  });


  spark.on('latency', function (data) {
    const { stats, proof } = data
    if (authorize(proof, stats)) {
      stats.id = proof.address
      Nodes.updateLatency(stats.id, stats.latency, function (err, latency) {
        if (err !== null) {
          console.error('API', 'PIN', 'Latency error:', err);
        }

        if (latency !== null) {
          console.success('API', 'PIN', 'Latency:', latency, 'from:', stats.id);
        }
      });

      if (Nodes.requiresUpdate(stats.id)) {
        var range = Nodes.getHistory().getHistoryRequestRange();

        spark.emit('history', range);
        console.success('API', 'HIS', 'Asked:', stats.id, 'for history:', range.min, '-', range.max);

        Nodes.askedForHistory(true);
      }
    }
  });


  spark.on('end', function (data) {
    Nodes.inactive(spark.id, function (err, stats) {
      if (err !== null) {
        console.error('API', 'CON', 'Connection with:', spark.address.ip, spark.id, 'end error:', err, '(try unlocking account)');
      } else {
        client.write({
          action: 'inactive',
          data: stats
        });

        console.warn('API', 'CON', 'Connection with:', spark.id, 'ended:', data);
      }
    });
  });
});


client.on('connection', function (clientSpark) {
  clientSpark.on('ready', function (data) {
    clientSpark.emit('init', { nodes: Nodes.all() });

    Nodes.getCharts();
  });

  clientSpark.on('client-pong', function (data) {
    var serverTime = _.get(data, "serverTime", 0);
    var latency = Math.ceil((_.now() - serverTime) / 2);

    clientSpark.emit('client-latency', { latency: latency });
  });
});

var latencyTimeout = setInterval(function () {
  client.write({
    action: 'client-ping',
    data: {
      serverTime: _.now()
    }
  });
}, 5000);


// Cleanup old inactive nodes
var nodeCleanupTimeout = setInterval(function () {
  client.write({
    action: 'init',
    data: Nodes.all()
  });

  Nodes.getCharts();

}, 1000 * 60 * 60);

server.listen(process.env.PORT || 3000);

module.exports = server;
