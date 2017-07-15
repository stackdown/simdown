const fs = require('fs')
const rp = require('request-promise')
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

    const dbPath = nodePath.resolve(__dirname, '../../dbs')

    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath)
    }

    this.dynamo = dynalite({
      path: `${dbPath}/dynamo`,
      createTableMs: 0,
      deleteTableMs: 0,
      updateTableMs: 0,
    })

    this.dynamo.listen(this.dynamoPort, (err) => {
      super.setup.call(_this, db, opts, (err, endpoint) => {
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
      this.reportCall(['DynamoDB', method, 'before'], {data}, () => {
        const reqOpts = {
          qs: req.query,
          uri: _this.dynamoEndpoint,
          json: data,
          method: req.method,
          headers: req.headers,
        }

        rp(reqOpts).then((results) => {
          this.reportCall(['DynamoDB', method, 'after'], {data, results}, () => {
            res.json(results)
          })
        }).catch((err) => {
          this.reportCall(['DynamoDB', method, 'after'], {data, err}, () => {
            res.status(400)
            res.header('x-amzn-errortype', 'ServiceError')
            res.json({
              message: err.message,
              code: 'ServiceError'
            })
          })
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