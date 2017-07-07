const fs = require('fs')
const async = require('async')
const dbutil = require('./lib/dbutil')

class Simdown {
  setup(callback) {
    let _this = this
    let services = []
    let endpoints = {}

    this.services = {}
    this.Services = this.loadServices()

    dbutil.setup((err, db) => {
      async.each(_this.Services, (Service, next) => {
        const service = new Service()
        services.push(service)
        this.services[service.constructor.name] = service

        service.setup(db, {}, (err, endpoint) => {
          endpoints[service.constructor.name] = endpoint
          next(err)
        })
      }, (err) => {
        callback(err, endpoints, services)
      })
    })
  }

  stop(callback) {
    async.each(this.services, (service, next) => {
      service.stop(next)
    }, callback)
  }

  loadServices() {
    let Services = {}
    const servicePath = require('path').resolve(__dirname, './lib/services')
    const serviceFiles = fs.readdirSync(servicePath)

    for (var file of serviceFiles) {
      let service = require(`${servicePath}/${file}`)
      Services[service.prototype.constructor.name] = service
    }

    return Services
  }
}

module.exports = Simdown