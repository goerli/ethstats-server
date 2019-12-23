import chalk from "chalk"
import * as util from "util"

declare global {
  interface Console {
    success: any
  }
}
const sections = [
  'API',
  'COL',
  'SYS'
]

const types = [
  'CON',
  'CHR',
  'UPD',
  'BLK',
  'TXS',
  'STA',
  'HIS',
  'PIN',
  'SIG'
]

const typeColors = {
  'CON': chalk.reset.bold.yellow,
  'CHR': chalk.reset.bold.red,
  'UPD': chalk.reset.bold.green,
  'BLK': chalk.reset.bold.blue,
  'TXS': chalk.reset.bold.cyan,
  'STA': chalk.reset.bold.red,
  'HIS': chalk.reset.bold.magenta,
  'PIN': chalk.reset.bold.yellow,
  'SIG': chalk.reset.bold.green,
}

const verbosity = [
  [],
  ['error'],
  ['error', 'warn', 'success'],
  ['info', 'error', 'warn', 'success', 'time', 'timeEnd']
]

const ENV_VERBOSITY = process.env.VERBOSITY || 2;

const formatter = function (sign: string, message: string) {
  return [sign, message]
}

const styles = [
  {
    name: 'info',
    sign: '=i=',
    signColor: chalk.blue,
    messageColor: chalk.bold,
    formatter
  },
  {
    name: 'success',
    inherit: 'log',
    sign: '=✓=',
    signColor: chalk.green,
    messageColor: chalk.bold.green,
    formatter
  },
  {
    name: 'warn',
    sign: '=!=',
    signColor: chalk.yellow,
    messageColor: chalk.bold.yellow,
    formatter
  },
  {
    name: 'error',
    sign: '=✘=',
    signColor: chalk.red,
    messageColor: chalk.bold.red,
    formatter
  },
  {
    name: 'time',
    sign: '=T=',
    signColor: chalk.cyan,
    messageColor: chalk.bold,
    formatter
  },
  {
    name: 'timeEnd',
    sign: '=T=',
    signColor: chalk.cyan,
    messageColor: chalk.bold,
    formatter
  }
]

styles.forEach(function (item) {
  if (item.inherit !== undefined) {
    // @ts-ignore
    console[item.name] = console[item.inherit]
  }

  // @ts-ignore
  const fn = console[item.name]

  // @ts-ignore
  console[item.name] = (...args) => {
    if (args.length === 0)
      return false

    // @ts-ignore
    if (verbosity[ENV_VERBOSITY].indexOf(item.name) === -1)
      return false

    let type = null,
      sign,
      time,
      section: string = 'API',
      message = ''

    if (args[0].indexOf(new Date().getFullYear()) >= 0) {
      time = args.splice(0, 1)
    }

    if (sections.indexOf(args[0]) >= 0) {
      section = args.splice(0, 1).toString()
    }

    if (types.indexOf(args[0]) >= 0) {
      type = args.splice(0, 1)
    }

    sign = item.signColor.bold('[') + chalk.reset.bold.white(section) + item.signColor.bold(']')

    if (type !== null) {
      // @ts-ignore
      sign = sign + ' ' + item.signColor.bold('[') + typeColors[type](type) + item.signColor.bold(']')
    }

    if (item.name !== 'time' && item.name !== 'timeEnd') {
      time = (new Date()).toJSON().replace('T', ' ').replace('Z', ' ')
    }

    sign = chalk.reset.magenta(time) + sign

    if (typeof args[0] === 'object') {
      message = util.inspect(args[0], {depth: null, colors: true})
    } else {
      // @ts-ignore
      message = item.messageColor(util.format.apply(util, args))
    }

    // @ts-ignore
    return fn.apply(this, item.formatter(sign, message))
  }
})
