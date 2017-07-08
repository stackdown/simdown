const nodePath = require('path')
const dynalite = require('dynalite')
const BaseService = require('../base_service')

class DynamoDB extends BaseService {
  setup(db, opts, callback) {
    this.port = opts.port || 44225
    this.host = 'localhost'
    this.endpoint = `http://${this.host}:${this.port}`

    this.server = dynalite({
      path: nodePath.resolve(__dirname, '../../dynamo')
    })

    this.server.listen(this.port, (err) => {
      callback(err)
    })
  }

  stop(callback) {
    this.server.close(callback)
  }
}

module.exports = DynamoDB