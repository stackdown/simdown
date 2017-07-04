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

const getDeepVal = function(obj, path) {
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
  constructor(manager) {
    this.manager = manager
  }

  handlers() {return {}}

  createItem(path, data, res, transforms) {
    let _this = this

    transforms = transforms || {}
    const dataTransforms = transforms.data || []
    for (var transform of dataTransforms) {
      data = transform(data)
    }

    this.log('Create item', path.join('.'), data)
    dbutil.put(this.db, path, data, function(err) {
      if (err) {
        _this.log('Put err', path, err)
        reportErr(res, err)
      } else {
        const respTransforms = transforms.resp || []
        for (var transform of respTransforms) {
          data = transform(data)
        }

        _this.log('Create sending back', path.join('.'), data)
        res.json(data)
      }
    })
  }

  updateItem(path, data, req, res, transforms) {
    let _this = this

    transforms = transforms || {}
    const dataTransforms = transforms.data || []
    for (var transform of dataTransforms) {
      data = transform(data)
    }

    dbutil.get(this.db, path, function(err, existing) {
      let update = req.body
      let updated = extend(true, existing || {}, update)

      _this.log("Updating item", path.join('.'), update)
      dbutil.put(_this.db, path, updated, function(err) {
        if (err) {
          _this.log('Put err', path, err)
          reportErr(res, err)
        } else {
          const respTransforms = transforms.resp || []
          for (var transform of respTransforms) {
            data = transform(data)
          }
          
          res.json(data)
        }
      })
    })
  }

  listItems(path, respPath, req, res) {
    let listOpts = undefined

    if (req.body.NextToken) {
      listOpts = JSON.parse(req.body.NextToken)
    } else {
      listOpts = {
        limit: 1000,
        offset: 0
      }
    }

    dbutil.list(this.db, path, listOpts, function(err, results) {
      if (err) {
        reportErr(res, err)
      } else {
        let resp = {}
        setDeepVal(resp, respPath, results)

        if (results.length >= listOpts.limit) {
          listOpts.offset += listOpts.limit
          resp.NextToken = JSON.stringify(listOpts)
        }

        res.json(resp)
      }
    })
  }

  deleteItem(path, poolId, req, res) {
    this.log('Delete item', poolId)
    dbutil.del(this.db, path, function(err) {
      respond(err, null, res)
    })
  }

  getItem(path, req, res, transforms) {
    let _this = this
    this.log("Getting item", path.join('.'))
    dbutil.get(this.db, path, function(err, results) {
      _this.log("Found item", path.join('.'), results)
      if (err) {
        reportErr(res, err)
      } else {
        let data = JSON.parse(results)

        transforms = transforms || {}
        const respTransforms = transforms.resp || []
        for (var transform of respTransforms) {
          data = transform(data)
        }

        _this.log('Get sending back', path.join('.'), data)
        res.json(data)
      }
    })
  }

  setup(db, opts, callback) {
    var _this = this

    this.db = db
    this.log = debug(`stackdown:${this.constructor.name}`)
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