#!/usr/bin/env node

const SimDown = require('../')
const argv = require('yargs')
  .usage('usage $0 <command> [options]')
  .command('start', 'setup simulation services')
  .example('$0 start')
  .command('save', 'archive the current API state')
  .example('$0 save [--name yourstate]')
  .command('load', 'load an archived API state')
  .example('$0 load --name yourstate')
  .command('remove', 'delete an archived API state')
  .example('$0 remove --name yourstate')
  .command('list', 'output the names of archived states')
  .example('$0 list')
  .help('h')
  .alias('h', 'help')
  .epilog('Copyright StackDown 2017')
  .argv

const [command, name] = argv._

if (command === undefined) {
  console.log("For help, run 'simdown help' or 'simdown -h'")
  process.exit()
}

if (name != undefined) {
  argv.name = name
}

const simdown = new SimDown()

switch(command) {
  
  case 'start': {
    simdown.setup({}, (err, endpoints) => {
      let str = '\nSimulated services running at:\n\n'

      for (let serviceName in endpoints) {
        const endpoint = endpoints[serviceName]
        str += `  ${serviceName}: ${endpoint}\n`
      }

      console.log(str)
    })

    break
  }

  case 'save': {
    const saveOpts = {
      name: argv.name
    }

    simdown.saveState(saveOpts, (err, finalName) => {
      console.log(`Successfully saved state ${finalName}`)
    })
    break
  }

  case 'load': {
    const loadOpts = {}

    simdown.loadState(argv.name, loadOpts, (err) => {
      console.log(`Successfully loaded state ${argv.name}`)
    })
    
    break
  }

  case 'remove': {
    const removeOpts = {}

    simdown.removeState(argv.name, removeOpts, (err) => {
      console.log(`Successfully removed state ${argv.name}`)
    })
    
    break
  }

  case 'list': {
    simdown.listStates({}, (err, states) => {
      if (states.length > 0) {
        let str = '\nArchived states:\n\n'

        for (let state of states) {
          str += state + '\n'
        }
        console.log(str)
      } else {
        console.log('\nNo archived states found\n')
      }
    })

    break
  }
}
