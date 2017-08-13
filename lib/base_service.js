const uuid = require('uuid')
const async = require('async')
const debug = require('debug')
const extend = require('extend')
const dbutil = require('./dbutil')
const express = require('express')
const bodyParser = require('body-parser')

function reportErr(res, err) {
  res.status(400)
  res.header('x-amzn-errortype', 'ServiceError')
  res.json({
    message: err.message,
    code: 'ServiceError'
  })
}

function respond(err, data, res) {
  if (err) {
    reportErr(res, err)
  } else {
    if (data) {
      res.json(data)
    } else {
      res.end()
    }
  }
}

function setDeepVal(obj, path, payload) {
  for (var iItem in path) {
    const item = path[iItem]
    if (iItem >= path.length - 1) {
      obj[item] = payload
    } else {
      obj[item] = {}
    }
  }
}

const getDeepVal = (obj, path) => {
  let retval = obj
  for (var iItem in path) {
    let item = path[iItem]
    if (iItem === path.length - 1) {
      return retval
    } else {
      retval = retval[item] || {}
    }
  }

  return retval
}

class BaseService {
  
  constructor(opts) {
    this.opts = opts || {}
    this.hooks = this.opts.hooks || {}
  }

  handlers() {return {}}

  createItem(path, data, callback) {
    this.log('Create item', path.join('.'), data)
    dbutil.put(this.db, path, data, (err) => {
      callback(err, data)
    })
  }

  updateItem(path, data, callback) {
    dbutil.get(this.db, path, (err, results) => {
      let existing = JSON.parse(results)
      let update = data

      let updated = existing ? extend(true, existing, update) : update

      this.log("Updating item", path.join('.'), update)
      dbutil.put(this.db, path, updated, (err) => {
        callback(err, data)
      })
    })
  }

  listItems(path, params, callback) {
    this.log('List items', path.join('.'))
    let listOpts = undefined

    if (params.NextToken) {
      listOpts = JSON.parse(params.NextToken)
    } else {
      listOpts = {
        limit: 1000,
        offset: 0
      }
    }

    dbutil.list(this.db, path, listOpts, (err, results) => {
      if (err) {
        callback(err)
      } else {
        let config = {}

        if (results.length >= listOpts.limit) {
          listOpts.offset += listOpts.limit
          config.NextToken = JSON.stringify(listOpts)
        }

        callback(null, results, config)
      }
    })
  }

  deleteItem(path, poolId, callback) {
    this.log('Delete item', poolId)
    dbutil.del(this.db, path, (err) => {
      callback(err)
    })
  }

  getItem(path, callback) {
    this.log("Getting item", path.join('.'))
    dbutil.get(this.db, path, (err, results) => {
      this.log("Found item", path.join('.'), results)
      if (err) {
        callback(err)
      } else {
        let data = JSON.parse(results)
        callback(null, data)
      }
    })
  }


  reportCall(path, report, callback) {
    async.forEachOf(this.hooks, (hookFn, hookPath, nextHook) => {
      const [pathService, pathMethod, pathType] = path
      const [hookService, hookMethod, hookType] = hookPath.split(':')

      if (path.join(':') === hookPath) {
        hookFn(path, report, nextHook)
      } else {
        nextHook()
      }
    }, (err) => {
      callback(err)
    })
  }

  setup(db, opts, callback) {
    this.db = db
    this.log = debug(`simdown:services:${this.constructor.name}`)
    this.host = 'localhost'
    this.endpoint = `http://${this.host}:${this.port}`
    this.setupOpts = opts

    this.app = express()

    this.app.use((req, res, next) => {
      this.log('Service Request', req.method, req.url)
      app._router.stack.forEach(function(r){
        if (r.route && r.route.path){
          console.log(r.route.path)
        }
      })
      next()
    })

    if (!this.disableParsing) {
      this.app.use(bodyParser.json({
        type: '*/*'
      }))

      this.app.use(bodyParser.urlencoded({
        extended: false
      }))
    }

    this.app.options('*', (req, res) => {
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

    async.forEachOf(handlers, (handler, route, next) => {
      const splitRoute = route.split(' ')
      const allMethods = splitRoute[0]
      const fullPath = splitRoute[1]
      const methods = allMethods.split(',')

      for (var method of methods) {
        this.app[method.toLowerCase()](fullPath, (req, res, next) => {
          handler(opts, req, res, next)
        })
      }
    }, () => {
      this.app.use((req, res, next) => {
        console.log("UNHANDLED #{@constructor.name} REQUEST", req.method, req.url, req.body)
        next()
      })
    })

    this.server = this.app.listen(this.port, () => {
      callback(null, this.endpoint)
    })
  }

  stop(callback) {
    this.server.close()
    callback()
  }
}

module.exports = BaseService