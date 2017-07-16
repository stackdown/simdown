const fs = require('fs')
const unzip = require('unzip')
const async = require('async')
const dbutil = require('./dbutil')
const nodePath = require('path')
const archiver = require('archiver')

class Simdown {
  constructor() {
    this.Services = this.loadServices()
  }

  setup(opts, callback) {
    this.opts = opts

    let services = []
    let endpoints = {}

    this.services = {}

    dbutil.setup((err, db) => {
      async.each(this.Services, (Service, next) => {
        const service = new Service()
        services.push(service)
        this.services[service.constructor.name] = service

        service.setup(db, opts, (err, endpoint) => {
          endpoints[service.constructor.name] = endpoint
          next(err)
        })
      }, (err) => {
        callback(err, endpoints, services)
      })
    })
  }

  saveState(opts, callback) {
    const archivePath = nodePath.resolve(__dirname, '../archives')

    if (!fs.existsSync(archivePath)) {
      fs.mkdirSync(archivePath)
    }

    const name = opts.name || new Date().toString()
    let output = fs.createWriteStream(`${archivePath}/${name}.zip`)
    let archive = archiver('zip')

    output.on('close', function() {
      callback(null, name)
    })

    archive.on('error', function(err) {
      callback(err)
    })

    archive.pipe(output)
    archive.directory('dbs', false, { date: new Date() })
    archive.finalize()
  }

  loadState(name, opts, callback) {
    const dbPath = nodePath.resolve(__dirname, '../dbs')
    const archivePath = nodePath.resolve(__dirname, '../archives')
    const filePath = `${archivePath}/${name}.zip`

    this.cleanup((err) => {
      fs.createReadStream(filePath)
        .pipe(unzip.Extract({ path: dbPath }))
        .on('close', () => {
          dbutil.setup((err, db) => {
            async.forEachOf(this.services, (service, serviceName, next) => {
              service.stop((err) => {
                service.setup(db, service.setupOpts, (err) => {
                  next(err)
                })
              })
            }, (err) => {
              callback(err)
            })
          })
        })
    })
  }

  listStates(opts, callback) {
    const archivePath = nodePath.resolve(__dirname, '../archives')
    const files = fs.readdirSync(archivePath)

    let names = []
    for(let file of files) {
      const extension = nodePath.extname(file)
      names.push(nodePath.basename(file, extension))
    }

    callback(null, names)
  }

  removeState(name, opts, callback) {
    const archivePath = nodePath.resolve(__dirname, '../archives')
    const filePath = `${archivePath}/${name}.zip`
    if (!fs.existsSync(archivePath)) {
      return callback()
    }

    fs.unlinkSync(filePath)
    callback(null)
  }

  cleanup(callback) {
    dbutil.cleanup(callback)
  }

  stop(callback) {
    async.each(this.services, (service, next) => {
      service.stop(next)
    }, callback)
  }

  loadServices() {
    let Services = {}
    const servicePath = nodePath.resolve(__dirname, './services')
    const serviceFiles = fs.readdirSync(servicePath)

    for (var file of serviceFiles) {
      let service = require(`${servicePath}/${file}`)
      Services[service.prototype.constructor.name] = service
    }

    return Services
  }
}

module.exports = Simdown