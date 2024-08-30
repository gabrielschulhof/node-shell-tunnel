const process = require('node:process')
const fs = require('node:fs')
const net = require('node:net')
const child_process = require('node:child_process')
const readline = require('node:readline')
const options = require('./src/options')

const splitCoords = coords => {
  const split = coords.split(':')
  const port = split.pop()
  return {
    host: split.join(':') || 'localhost',
    port
  }
}

const [localCoords, remoteCoords] = (options.L || options.R).split('|')
const {host: localHost, port: localPort} = splitCoords(localCoords)
const {host: remoteHost, port: remotePort} = splitCoords(remoteCoords)

const remoteReplString = fs.readFileSync('./src/bootstrap.js', 'utf8')
const remoteSetup = [
  ...fs
    .readFileSync('./src/remoteSetup.js', 'utf8')
    .split('\n')
    .filter(line => !!line),
    '',
    // The second newline indicates the end of the remote setup script.
    ''
  ].join('\n')

const pipe = child_process.spawn(options._[0], [...options._.slice(1), `node -e '${remoteReplString}'`], {stdio: 'pipe'})

const remoteStderr = readline.createInterface({input: pipe.stderr})
remoteStderr.on('line', line => console.error(`remote stderr: ${line}`))
remoteStderr.on('close', () => console.error('remote stderr EOF'))

pipe.stdin.write(remoteSetup)
pipe.stdin.write(`${options.L ? 'false': 'true'}\n`)
pipe.stdin.write(`${remoteHost}\n`)
pipe.stdin.write(`${remotePort}\n`)
pipe.stdin.write('\n')

process.stdin.on('data', data => {
  console.log('writing data to remote stdin')
  pipe.stdin.write(data)
})
