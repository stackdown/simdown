const fs = require('fs')
const async = require('async')

class Simdown {
  setup(callback) {
    this.services = this.loadServices()
  }

  loadServices() {
    let services = {}
    const servicePath = require('path').resolve(__dirname, './lib/services')
    const serviceFiles = fs.readdirSync(servicePath)

    for (var file of serviceFiles) {
      let service = require(`${servicePath}/${file}`)
      services[service.prototype.name] = service
    }

    return services
  }
}

module.exports = Simdown