const process = require('node:process')
const readline = require('node:readline')

return (argList) => new Promise((resolve, reject) => {
  const keys = [
    'isListening',
    'host',
    'port'
  ]

  if (argList.length !== keys.length) {
    throw new Error('Incorrect number of arguments')
  }

  const options = keys.reduce((acc, key, index) => Object.assign(acc, {[key]: argList[index]}), {})
})
