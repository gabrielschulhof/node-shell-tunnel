const process = require('node:process')

const runAsChild = () => {
  const setupListener = data => {
    console.error(`child: data on stdin: ${data.toString('utf8')}`)
    process.stdout.write(data)
  }
  process.stdin.on('data', setupListener)
}

const runAsParent = async () => {
  const child_process = require('node:child_process')

  const [localPort, remotePort] = (process.argv.filter(arg => arg.match(/[0-9]+:[0-9]+/))[0] || '').match(/[^:]+/g)
  const listenRemotely = process.argv.includes('-R')
  const commandArgs = process.argv.slice(process.argv.findIndex(arg => arg === '--') + 1)
  const command = commandArgs.shift()

  const child = child_process.spawn(command, commandArgs, {
    stdio: ['pipe', 'pipe', 'inherit']
  })

  process.stdin.on('data', data => {
    console.log(`parent: data on stdin: ${data.toString('utf8')}`)
    child.stdin.write(data)
  })
  child.stdout.on('data', data => {
    console.log(`parent: data from child: ${data.toString('utf8')}`)
  })
}

;(async () => await (process.argv.length === 2 ? runAsChild() : runAsParent()))()
