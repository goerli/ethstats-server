import './utils/logger'
// @ts-ignore
import Primus from "primus"
// @ts-ignore
import * as primusEmit from "primus-emit"
// @ts-ignore
import * as primusSparkLatency from "primus-spark-latency"
// @ts-ignore
import _ from "lodash"
import { Keccak } from 'sha3'
// @ts-ignore
import { ec as EC } from "elliptic"
// @ts-ignore
import { KeyPair } from "elliptic/lib/elliptic/ec"
import { createServer } from "http"
import routes from "./routes"
import Collection from './collection'
import {
  banned,
  reserved,
  trusted
} from "./utils/config"
import Node from "./node"
import { Stats } from "./interfaces/stats";
import { NodeData } from "./interfaces/nodedata";
import { Pending } from "./interfaces/pending";
import { Proof } from "./interfaces/proof";
import { NodeInfo } from "./interfaces/nodeinfo";
import { BasicStats, BasicStats2 } from "./interfaces/basicstats";
import { ChartData } from "./interfaces/chartdata";
import { BlockStats } from "./interfaces/blockstats";

// general config
const clientPingTimeout = 5 * 1000
const nodeCleanupTimeout = 1000 * 60 * 60
const port = process.env.PORT || 3000

// add trusted from env
if (process.env.TRUSTED_ADDRESSES) {
  trusted.push(...process.env.TRUSTED_ADDRESSES.split(','))
}
if (process.env.BANNED_ADDRESSES) {
  banned.push(...process.env.BANNED_ADDRESSES.split(','))
}
if (process.env.RESERVED_ADDRESSES) {
  reserved.push(...process.env.RESERVED_ADDRESSES.split(','))
}

export default class Server {

  private nodes: Collection
  private api: Primus
  private client: Primus
  private readonly external: Primus

  constructor() {
    console.log('Starting server!')

    const server = createServer(routes)

    server.headersTimeout = 0.9 * 1000
    server.maxHeadersCount = 0
    server.timeout = 0.6 * 1000

    this.api = new Primus(server, {
      transformer: 'websockets',
      pathname: '/api',
      parser: 'JSON',
      compression: true,
      pingInterval: false
    })

    this.client = new Primus(server, {
      transformer: 'websockets',
      pathname: '/primus',
      parser: 'JSON',
      compression: true,
      pingInterval: false
    })

    this.external = new Primus(server, {
      transformer: 'websockets',
      pathname: '/external',
      parser: 'JSON'
    })

    this.nodes = new Collection(this.external)

    server.listen(port)
  }

  static sanitize(stats: Stats) {
    return (
      !_.isUndefined(stats) && !_.isUndefined(stats.id)
    )
  }

  static authorize(proof: Proof, stats: Stats) {
    let isAuthorized = false

    if (
      Server.sanitize(stats)
      && !_.isUndefined(proof)
      && !_.isUndefined(proof.publicKey)
      && !_.isUndefined(proof.signature)
      && reserved.indexOf(stats.id) < 0
      && trusted
        .map(address => address && address.toLowerCase())
        .indexOf(proof.address) >= 0
    ) {
      const hasher = new Keccak(256)
      hasher.update(JSON.stringify(stats))
      const msgHash = hasher.digest('hex')

      const secp256k1 = new EC('secp256k1')
      const pubkeyNoZeroX = proof.publicKey.substr(2)

      let pubkey: KeyPair

      try {
        pubkey = secp256k1.keyFromPublic(pubkeyNoZeroX, 'hex')
      } catch (err) {
        console.error('API', 'SIG', 'Public Key Error', err.message)
        return false
      }

      const addressHasher = new Keccak(256)
      addressHasher.update(pubkeyNoZeroX.substr(2), 'hex')

      const addressHash = addressHasher.digest('hex').substr(24)

      if (!(addressHash.toLowerCase() === proof.address.substr(2).toLowerCase())) {
        console.error('API', 'SIG', 'Address hash did not match', addressHash, proof.address.substr(2))
      }

      const signature: {
        r: string
        s: string
      } = {
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
          console.error('API', 'SIG', 'Signature did not verify')
          return false
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

  wireup() {
    setInterval(() => {
      this.client.write({
        action: 'client-ping',
        data: {
          serverTime: _.now()
        }
      })
    }, clientPingTimeout)

    // Cleanup old inactive nodes
    setInterval(() => {
      this.client.write({
        action: 'init',
        data: this.nodes.all()
      })

      this.nodes.getCharts()

    }, nodeCleanupTimeout)
  }

  initApi() {
    // Init API Socket connection
    this.api.plugin('emit', primusEmit)
    this.api.plugin('spark-latency', primusSparkLatency)

    // Init API Socket events
    this.api.on('connection', (spark: Primus.spark) => {
      console.info('API', 'CON', 'Open:', spark.address.ip)

      spark.on('hello', (data: NodeData) => {
        const {stats, proof}: { stats: Stats, proof: Proof } = data

        if (
          banned.indexOf(spark.address.ip) >= 0 ||
          !Server.authorize(proof, stats)
        ) {

          spark.end(undefined, {reconnect: false})

          console.error(
            'API', 'CON', 'Closed - wrong auth',
            'name:', stats.id,
            'address:', stats.address
          )

          return false
        }

        console.info('API', 'CON', 'Hello', stats.id)

        if (!_.isUndefined(stats.info)) {
          stats.id = proof.address
          stats.address = proof.address
          stats.ip = spark.address.ip
          stats.spark = spark.id
          stats.latency = spark.latency || 0

          this.nodes.add(stats, (err: Error | string, info: NodeInfo) => {
            if (err) {
              console.error('API', 'CON', 'Connection error:', err)
              return false
            }

            if (info) {
              spark.emit('ready')

              console.success('API', 'CON', 'Connected', stats.id)

              this.client
                .write({
                  action: 'add',
                  data: info
                })
            }
          })
        }
      })

      spark.on('block', (data: NodeData) => {
        const {
          stats,
          proof
        }: {
          stats: Stats,
          proof: Proof
        } = data

        if (Server.sanitize(stats) && !_.isUndefined(stats.block)) {
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

              const search = {id: validator.address}
              const index: number = this.nodes.getIndex(search)
              const node: Node = this.nodes.getNodeOrNew(search, validator)

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

          this.nodes.addBlock(
            stats.id,
            stats.block,
            (err: Error | string, updatedStats: BlockStats) => {

              if (err) {
                console.error('API', 'BLK', 'Block error:', err, updatedStats)
              } else if (updatedStats) {

                this.client.write({
                  action: 'block',
                  data: updatedStats
                })

                console.success('API', 'BLK',
                  'Block:', updatedStats.block['number'],
                  'td:', updatedStats.block['totalDifficulty'],
                  'from:', updatedStats.id, 'ip:', spark.address.ip)

                this.nodes.getCharts()
              }
            })
        } else {
          console.error('API', 'BLK', 'Block error:', data)
        }
      })

      spark.on('pending', (data: NodeData) => {
        const {stats, proof}: { stats: Stats, proof: Proof } = data

        if (Server.sanitize(stats) && !_.isUndefined(stats.stats)) {

          stats.id = proof.address
          this.nodes.updatePending(
            stats.id,
            stats.stats,
            (err: Error | string, pending: Pending) => {
              if (err) {
                console.error('API', 'TXS', 'Pending error:', err)
              }

              if (pending) {
                this.client.write({
                  action: 'pending',
                  data: pending
                })

                console.success(
                  'API', 'TXS', 'Pending:',
                  pending['pending'],
                  'from:', pending.id
                )
              }
            })
        } else {
          console.error('API', 'TXS', 'Pending error:', data)
        }
      })

      spark.on('stats', (data: NodeData) => {
        const {
          stats,
          proof
        }: {
          stats: Stats,
          proof: Proof
        } = data

        if (Server.sanitize(stats) && !_.isUndefined(stats.stats)) {

          stats.id = proof.address

          this.nodes.updateStats(
            stats.id, stats.stats,
            (err: Error | string, basicStats: BasicStats) => {
              if (err) {
                console.error('API', 'STA', 'Stats error:', err)
              } else {

                if (basicStats) {
                  this.client.write({
                    action: 'stats',
                    data: basicStats
                  })

                  console.success('API', 'STA', 'Stats from:', stats.id)
                }
              }
            })
        }
      })

      spark.on('node-ping', (data: NodeData) => {
        const {stats, proof}: { stats: Stats, proof: Proof } = data

        if (Server.sanitize(stats)) {
          stats.id = proof.address
          const start = (!_.isUndefined(stats.clientTime) ? stats.clientTime : null)

          spark.emit('node-pong', {
            clientTime: start,
            serverTime: _.now()
          })

          console.success('API', 'PIN', 'Ping from:', stats.id)
        }
      })

      spark.on('latency', (data: NodeData) => {
        const {stats, proof} = data
        if (Server.sanitize(stats)) {
          stats.id = proof.address
          this.nodes.updateLatency(stats.id, stats.latency, (err, latency) => {
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
        }
      })

      spark.on('end', (data: NodeData) => {
        this.nodes.inactive(
          spark.id,
          (err: Error | string, stats: BasicStats2
          ) => {

            if (err) {
              console.error(
                'API', 'CON',
                'Connection with:', spark.address.ip, spark.id,
                'end error:', err, '(try unlocking account)'
              )
            } else {
              this.client.write({
                action: 'inactive',
                data: stats
              })

              console.warn(
                'API', 'CON',
                'Connection with:', spark.id, 'ended:', data
              )
            }
          })
      })
    })
  }

  initClient() {
    // Init Client Socket connection
    this.client.plugin('emit', primusEmit)

    this.client.on('connection', (spark: Primus.spark) => {

      spark.on('ready', () => {
        spark.emit(
          'init',
          {nodes: this.nodes.all()}
        )

        this.nodes.getCharts()
      })

      spark.on('client-pong', (data: NodeData) => {
        const serverTime = _.get(data, 'serverTime', 0)
        const latency = Math.ceil((_.now() - serverTime) / 2)

        spark.emit('client-latency', {latency: latency})
      })
    })
  }

  initExternal() {
    // Init external API
    this.external.plugin('emit', primusEmit)
  }

  initNodes() {
    // Init collections
    this.nodes.setChartsCallback((err: Error | string, charts: ChartData) => {
      if (err) {
        console.error('COL', 'CHR', 'Charts error:', err)
      } else {
        this.client.write({
          action: 'charts',
          data: charts
        })
      }
    })
  }

  init() {
    this.initApi()
    this.initClient()
    this.initExternal()
    this.initNodes()
    this.wireup()
  }
}
