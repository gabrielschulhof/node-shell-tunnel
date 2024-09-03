const process = require('node:process')
const net = require('node:net')
const readline = require('node:readline')

const line = input => new Promise((resolve, reject) => {
  const rl = readline.createInterface({input})
  const conclude = (err, line) => {
    rl.off('line', lineCb)
    input.off('error', errCb)

    if (err) {
      reject(err)
    } else {
      resolve(line)
    }
  }
  const lineCb = line => conclude(null, line)
  const errCb = err => conclude(err)

  rl.on('line', lineCb)
  input.on('error', errCb)
})

const sockId = c => `${process.hrtime.bigint()}${c._handle.fd}${Math.round(Math.random() * 65536)}`

const portForward = async (port, input, output, listen) => {
  console.error(`portForward: ${JSON.stringify({port, listen})}`)
  const connections = {}

  const deleteConnection = (id, err) => {
    const c = connections[id]
    delete connections[id]
    console.error(`deleteConnection: ${JSON.stringify({id, err}, null, 2)}`)
    c.destroy.apply(c, err ? [err] : [])
  }

  const setupSocket = (c, id) => {
    console.error(`setupSocket ${id}`)
    const conclude = (err, toSend) => {
      console.error(`socket ${id} ending with ${JSON.stringify({err, toSend})}`)
      c.off('data', onData)
      c.off('end', onEnd)
      c.off('error', onError)
      deleteConnection(id, err)
      output.write(`${JSON.stringify({id, ...toSend})}\n`)
    }

    const onData = data => {
      console.error(`${id}: data from socket: ${data.length} bytes`)
      output.write(`${JSON.stringify({id, length: data.length})}\n`)
      output.write(data)
    }
    const onEnd = () => conclude(undefined, {end: true})
    const onError = (err) => conclude(err, {err})

    c.on('data', onData)
    c.on('end', onEnd)
    c.on('error', onError)

    connections[id] = c
  }

  if (listen) {
    console.error(`createServer on port ${port}`)
    net
      .createServer(c => setupSocket(c, sockId(c)))
      .on('error', err => { throw err })
      .listen(port)
  }

  let buf = Buffer.alloc(0)
  let currentId
  let currentLength
  input.on('data', async data => {
    console.error(`input: data: Entering with data of length ${data.length}`)
    buf = Buffer.concat([buf, data])
    console.error(`input: data: buf is |${buf.toString('utf8')}|`)
    console.error(`input: data: Buffer has become |${buf.toString('utf8')}|`)
    if (currentId === undefined) {
      const nl = buf.indexOf('\n')
      console.error(`input: data: nl: ${nl}`)
      if (nl > 0) {
        const {id, length, end, err} = JSON.parse(new TextDecoder().decode(buf.subarray(0, nl)))
        currentLength = length
        currentId = id
        buf = buf.subarray(nl + 1)
        console.error(`input: data: current established as ${JSON.stringify({currentId, currentLength}, null, 2)} with buffer containing |${buf.toString('utf8')}|`)
        // Pretend the JSON object never happened, and the incoming data is whatever followed the JSON object. We need
        // this because we handle the case where we already have a currentId and we're sending data to the
        // corresponding socket independently from the case where we're trying to establish the new socket.
        data = buf
        if (end || err) {
          deleteConnection(id, err)
          currentLength = undefined
          currentId = undefined
          return
        }
        if (!(id in connections)) {
          if (listen) {
            throw new Error(`Invalid connection ID ${id}`)
          } else {
            setupSocket(net.connect(port, '127.0.0.1'), id)
          }
        }
      }
    }
    if (currentId) {
      console.error(`input: data: with currentId ${currentId}`)
      currentLength -= data.length
      if (currentLength > 0) {
        console.error(`input: data: bytes still needed: ${currentLength}`)
        connections[currentId].write(buf)
        buf = Buffer.alloc(0)
      } else {
        // currentLength is negative.
        console.error(`input: data: count of superfluous bytes: ${-currentLength}`)
        connections[currentId].write(buf.subarray(0, buf.length + currentLength))
        buf = buf.subarray(data.length, -currentLength)
        console.error(`input: data: buf is now of size ${buf.length}`)
        currentId = undefined
        currentLength = undefined
      }
    }
    console.error('input: data: Exiting')
  })
}

const runAsChild = async () => {
  const { port, listen } = JSON.parse(await line(process.stdin))
  process.stdout.write('OK\n')
  portForward(port, process.stdin, process.stdout, listen)
}

const runAsParent = async () => {
  const child_process = require('node:child_process')

  const [localPort, remotePort] = (process.argv.filter(arg => arg.match(/[0-9]+:[0-9]+/))[0] || '').match(/[^:]+/g)
  const listenRemotely = process.argv.includes('-R')
  const commandArgs = process.argv.slice(process.argv.findIndex(arg => arg === '--') + 1)
  console.error(`${JSON.stringify({localPort, remotePort, listenRemotely, commandArgs}, null, 2)}`)
  const command = commandArgs.shift()
  const child = child_process.spawn(command, commandArgs, {
    stdio: ['pipe', 'pipe', 'pipe']
  })

  // Prefix stderr chatter from child with "child: ".
  readline
    .createInterface({input: child.stderr})
    .on('line', line => console.error(`child: ${line}`))

  // Tell the child what to do.
  child.stdin.write(`${JSON.stringify({port: remotePort, listen: listenRemotely})}\n`)
  if ((await line(child.stdout)) !== 'OK') {
    throw new Error('Child did not acknowledge')
  }

  // Get to doing our part.
  portForward(localPort, child.stdout, child.stdin, !listenRemotely)
}

process.argv.length === 2 ? runAsChild() : runAsParent()
