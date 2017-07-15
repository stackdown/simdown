#!/usr/bin/env node

const SimDown = require('../')
const argv = require('yargs')
  .usage('usage $0 <command> [options]')
  .command('start', 'setup simulation services')
  .example('$0 start')
  .help('h')
  .alias('h', 'help')
  .epilog('copyright StackDown 2017')
  .argv

const command = argv._[0]

const simdown = new SimDown()

switch(command) {
  case 'start': {
    simdown.setup({}, (err, endpoints) => {
      let str = '\nSimDown running with endpoints:\n\n'

      for (let serviceName in endpoints) {
        const endpoint = endpoints[serviceName]
        str += `  ${serviceName}: ${endpoint}\n`
      }

      console.log(str)
    })

    break
  }
}
