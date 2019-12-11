require('./lib/utils/logger')

const _ = require('lodash')
const { Keccak } = require('sha3')
const EC = require('elliptic').ec
const http = require('http')

let banned = require('./lib/utils/config').banned
let reserved = require('./lib/utils/config').reserved
let trusted = require('./lib/utils/config').trusted

if (process.env.TRUSTED_NODE) {
  trusted.push(process.env.TRUSTED_NODE)
}

const clientPingTimeout = 5 * 1000
const nodeCleanupTimeout = 1000 * 60 * 60
const defaultPort = 3000

let server

// Init http server
if (process.env.NODE_ENV === 'production') {
  console.log('starting production server!')
  server = http.createServer()
} else {
  const app = require('./lib/express')
  server = http.createServer(app)
}

// Init socket vars
const Primus = require('primus')

// Init API Socket connection
const api = new Primus(server, {
  transformer: 'websockets',
  pathname: '/api',
  parser: 'JSON'
})

api.plugin('emit', require('primus-emit'))
api.plugin('spark-latency', require('primus-spark-latency'))

// Init Client Socket connection
const client = new Primus(server, {
  transformer: 'websockets',
  pathname: '/primus',
  parser: 'JSON'
})

client.plugin('emit', require('primus-emit'))

// Init external API
external = new Primus(server, {
  transformer: 'websockets',
  pathname: '/external',
  parser: 'JSON'
})

external.plugin('emit', require('primus-emit'))

// Init collections
const Collection = require('./lib/collection')
const Nodes = new Collection(external)

Nodes.setChartsCallback((err, charts) => {
  if (err) {
    console.error('COL', 'CHR', 'Charts error:', err)
  } else {
    client.write({
      action: 'charts',
      data: charts
    })
  }
})

const sanitize = stats => {
  return (
    !_.isUndefined(stats)
    && !_.isUndefined(stats.id)
  )
}

const authorize = (proof, stats) => {
  let isAuthorized = false
  if (sanitize(stats)
    && !_.isUndefined(proof)
    && !_.isUndefined(proof.publicKey)
    && !_.isUndefined(proof.signature)
    && reserved.indexOf(stats.id) < 0
    && trusted.map(address => address && address.toLowerCase())
      .indexOf(proof.address) >= 0
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
    const addressHash = addressHasher.digest('hex').substr(24)
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
        throw new Error('Signature did not verify')
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
api.on('connection', (spark) => {
  console.info('API', 'CON', 'Open:', spark.address.ip)

  spark.on('hello', (data) => {
    const { stats, proof } = data
    if (banned.indexOf(spark.address.ip) >= 0
      || !authorize(proof, stats)) {
      spark.end(undefined, { reconnect: false })
      console.error('API', 'CON', 'Closed - wrong auth', data)
      return false
    }
    console.info('API', 'CON', 'Hello', stats.id)

    if (!_.isUndefined(stats.info)) {
      stats.id = proof.address
      stats.address = proof.address
      stats.ip = spark.address.ip
      stats.spark = spark.id
      stats.latency = spark.latency || 0

      Nodes.add(stats, (err, info) => {
        if (err) {
          console.error('API', 'CON', 'Connection error:', err)
          return false
        }

        if (info) {
          spark.emit('ready')

          console.success('API', 'CON', 'Connected', stats.id)

          client.write({
            action: 'add',
            data: info
          })
        }
      })
    }
  })

  spark.on('block', (data) => {
    const { stats, proof } = data
    if (sanitize(stats)
      && !_.isUndefined(stats.block)) {
      stats.id = proof.address
      if (stats.block.validators && stats.block.validators.registered) {
        stats.block.validators.registered.forEach(validator => {
          validator.registered = true
          // trust registered validators and signers - not safe
          if (validator.address && trusted.indexOf(validator.address) === -1) {
            trusted.push(validator.address)
          }
          if (validator.signer && trusted.indexOf(validator.signer) === -1) {
            trusted.push(validator.signer)
          }
          const search = { id: validator.address }
          const index = Nodes.getIndex(search)
          const node = Nodes.getNodeOrNew(search, validator)
          if (index < 0) {
            // only if new node
            node.setValidatorData(validator)
          }
          node.validatorData = validator
          if (stats.block.validators.elected.indexOf(validator.address) > -1) {
            node.validatorData.elected = true
          }
          node.validatorData.registered = true
          return node.name
        })
      }

      Nodes.addBlock(stats.id, stats.block, (err) => {
        if (err) {
          console.error('API', 'BLK', 'Block error:', err, stats)
        } else if (stats) {
          client.write({
            action: 'block',
            data: stats
          })

          console.success('API', 'BLK',
            'Block:', stats.block['number'],
            'td:', stats.block['totalDifficulty'],
            'from:', stats.id, 'ip:', spark.address.ip)

          Nodes.getCharts()
        }
      })
    } else {
      console.error('API', 'BLK', 'Block error:', data)
    }
  })

  spark.on('pending', (data) => {
    const { stats, proof } = data
    if (sanitize(stats)
      && !_.isUndefined(stats.stats)) {
      stats.id = proof.address
      Nodes.updatePending(stats.id, stats.stats, (err, pending) => {
        if (err) {
          console.error('API', 'TXS', 'Pending error:', err)
        }

        if (pending) {
          client.write({
            action: 'pending',
            data: pending
          })

          console.success('API', 'TXS', 'Pending:', pending['pending'], 'from:', pending.id)
        }
      })
    } else {
      console.error('API', 'TXS', 'Pending error:', data)
    }
  })

  spark.on('stats', (data) => {
    const { stats, proof } = data
    if (sanitize(stats)
      && !_.isUndefined(stats.stats)) {
      stats.id = proof.address
      Nodes.updateStats(stats.id, stats.stats, (err, stats) => {
        if (err) {
          console.error('API', 'STA', 'Stats error:', err)
        } else {
          if (stats) {
            client.write({
              action: 'stats',
              data: stats
            })

            console.success('API', 'STA', 'Stats from:', stats.id)
          }
        }
      })
    }
  })

  spark.on('history', (data) => {
    const { stats } = data
    console.success('API', 'HIS', 'Got history from:', stats.id)
  })

  spark.on('node-ping', (data) => {
    const { stats, proof } = data
    if (sanitize(stats)) {
      stats.id = proof.address
      const start = (!_.isUndefined(stats.clientTime) ? stats.clientTime : null)

      spark.emit('node-pong', {
        clientTime: start,
        serverTime: _.now()
      })

      console.success('API', 'PIN', 'Ping from:', stats.id)
    }
  })

  spark.on('latency', (data) => {
    const { stats, proof } = data
    if (sanitize(stats)) {
      stats.id = proof.address
      Nodes.updateLatency(stats.id, stats.latency, (err, latency) => {
        if (err) {
          console.error('API', 'PIN', 'Latency error:', err)
        }

        if (latency) {
          console.success(
            'API', 'PIN',
            'Latency:', JSON.stringify(latency, null, 2),
            'from:', stats.id
          )
        }
      })

      if (Nodes.requiresUpdate(stats.id)) {
        const range = Nodes.getHistory().getHistoryRequestRange()

        if (range) {
          spark.emit('history', range)
          console.success('API', 'HIS', 'Asked:', stats.id, 'for history:', range.min, '-', range.max)

          Nodes.askedForHistory(true)
        }
      }
    }
  })

  spark.on('end', (data) => {
    Nodes.inactive(spark.id, (err, stats) => {
      if (err) {
        console.error('API', 'CON', 'Connection with:', spark.address.ip, spark.id, 'end error:', err, '(try unlocking account)')
      } else {
        client.write({
          action: 'inactive',
          data: stats
        })

        console.warn('API', 'CON', 'Connection with:', spark.id, 'ended:', data)
      }
    })
  })
})

client.on('connection', (clientSpark) => {
  clientSpark.on('ready', () => {
    clientSpark.emit(
      'init',
      { nodes: Nodes.all() }
    )

    Nodes.getCharts()
  })

  clientSpark.on('client-pong', (data) => {
    const serverTime = _.get(data, 'serverTime', 0)
    const latency = Math.ceil((_.now() - serverTime) / 2)

    clientSpark.emit('client-latency', { latency: latency })
  })
})

setInterval(() => {
  client.write({
    action: 'client-ping',
    data: {
      serverTime: _.now()
    }
  })
}, clientPingTimeout)

// Cleanup old inactive nodes
setInterval(() => {
  client.write({
    action: 'init',
    data: Nodes.all()
  })

  Nodes.getCharts()

}, nodeCleanupTimeout)

server.listen(process.env.PORT || defaultPort)

module.exports = server
