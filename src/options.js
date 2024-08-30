const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const CONNECT_ARG = '[<local_address>:]<local_port>|[<remote_address>:]<remote_port></remote_port>'

module.exports = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options] -- <shell to get to remote Node.js>')
  .option('L', {
    describe: `Listen locally and connect remotely: ${CONNECT_ARG}`,
    type: 'string',
  })
  .option('R', {
    describe: `Listen remotely and connect locally: ${CONNECT_ARG}`,
    type: 'string',
  })
  .check(argv => {
    if (!!argv.L === !!argv.R) {
      throw new Error('Please specify at least -L or -R, and not both.')
    }

    if (argv._.length === 0) {
      throw new Error('Please specify a command with which to execute the shell that runs Node.js.')
    }

    const arg = argv.L || argv.R
    if (!arg.includes('|')) {
      throw new Error(`The argument to -L or -R must be of the form ${CONNECT_ARG}.`)
    }

    return true
  }).parse()
