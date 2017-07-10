const rp = require('request-promise')
const proxy = require('http-proxy')
const nodePath = require('path')
const dynalite = require('dynalite')
const BaseService = require('../base_service')

class DynamoDB extends BaseService {
  handlers() {
    return {
      "ALL *": this.handleRequest.bind(this)
    }
  }

  setup(db, opts, callback) {
    let _this = this
    
    this.port = opts.port || 44225
    this.dynamoPort = opts.port || 44230
    this.disableParsing = true

    this.dynamo = dynalite({
      path: nodePath.resolve(__dirname, '../../dynamo')
    })

    this.dynamo.listen(this.dynamoPort, (err) => {
      super.setup.call(_this, db, opts, (err, endpoint) => {
        _this.proxy = proxy.createProxyServer({
          host: `http://${_this.host}`,
          port: _this.port,
        })

        _this.dynamoEndpoint = `http://${_this.host}:${_this.dynamoPort}`
        callback(err, endpoint)
      })
    })
  }

  handleRequest(opts, req, res, next) {
    let _this = this
    let allData = ''

    const target = req.headers['x-amz-target']
    const method = target.split('.')[1]

    req.on('data', (data) => {
      allData += data.toString()
    })

    req.on('end', () => {
      let data = JSON.parse(allData)

      const reqOpts = {
        qs: req.query,
        uri: _this.dynamoEndpoint,
        json: data,
        method: req.method,
        headers: req.headers,
      }

      rp(reqOpts).then((results) => {
        res.json(results)
      }).catch((err) => {
        res.status(400)
        res.header('x-amzn-errortype', 'ServiceError')
        res.json({
          message: err.message,
          code: 'ServiceError'
        })
      })
    })
  }

  stop(callback) {
    let _this = this
    this.dynamo.close((err) => {
      super.stop.apply(_this, arguments)
    })
  }
}

module.exports = DynamoDB