const Module = require(`node:module`)
const process = require(`node:process`)
const readline = require(`node:readline`)

;(async function() {
  const codeToRequire = []
  const args = []
  let dest = codeToRequire

  const rl = readline.createInterface({ input: process.stdin })
  for await (const line of rl) {
    if (!line) {
      if (dest === args) {
        break
      }
      dest = args
      continue
    }
    dest.push(line)
  }

  await (new Module(`remoteCode`))._compile(codeToRequire.join(`\n`), `remoteCode`)(args)

  rl.close()
})()
