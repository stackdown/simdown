'use strict'

const async = require('async')
const express = require('express')
const bodyParser = require('body-parser')

class BaseService {
  constructor(manager) {
    this.manager = manager
  }

  handlers() {return {}}

  setup(db, opts, callback) {
    var _this = this

    this.db = db
    this.host = 'localhost'
    this.endpoint = `http://${this.host}:${this.port}`

    this.app = express()

    if (!this.disableParsing) {
      this.app.use(bodyParser.json({
        type: '*/*'
      }))

      this.app.use(bodyParser.urlencoded({
        extended: false
      }))
    }

    this.app.options('*', function(req, res) {
      const headers = {
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, X-Amz-Content-Sha256, X-Amz-User-Agent, x-amz-security-token, X-Amz-Date, X-Amz-Invocation-Type, Authorization, access-control-allow-origin',
        'Access-Control-Expose-Headers': 'x-amzn-RequestId,x-amzn-ErrorType,x-amzn-ErrorMessage,Date,x-amz-log-result,x-amz-function-error',
        'Access-Control-Allow-Credentials': false,
      }

      res.writeHead(200, headers)
      res.end()
    })

    const handlers = this.handlers()

    async.forEachOf(handlers, function(handler, route, next) {
      const splitRoute = route.split(' ')
      const allMethods = splitRoute[0]
      const fullPath = splitRoute[1]
      const methods = allMethods.split(',')

      for (var method of methods) {
        _this.app[method.toLowerCase()](fullPath, function(req, res, next) {
          handler(opts, req, res, function(err) {
            next(err)
          })
        })
      }
    }, function() {
      _this.app.use(function(req, res, next) {
        console.log("UNHANDLED #{@constructor.name} REQUEST", req.method, req.url, req.body)
        next()
      })
    })

    this.server = this.app.listen(this.port, function() {
      callback(null, _this.endpoint)
    })
  }

  stop(callback) {
    this.server.close()
    callback()
  }
}

module.exports = BaseService