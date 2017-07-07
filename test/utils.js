const AWS = require('aws-sdk')
const imap = require('imap')
const async = require('async')
const debug = require('debug')
const dbutil = require('../lib/dbutil')

log = debug(`simdown:testutil`)

exports.cleanup = (test, services) => {
  async.each(services, (service, next) => {
    service.stop(() => {
      next()
    })
  }, (err) => {
    dbutil.cleanup(() => {
      test.end()
    })
  })
}

exports.setup = (Services, callback) => {
  let endpoints = {}
  let services = []

  dbutil.setup((err, db) => {
    async.each(Services, (Service, next) => {
      const service = new Service()
      services.push(service)

      service.setup(db, {}, (err, endpoint) => {
        endpoints[service.constructor.name] = endpoint
        next(err)
      })
    }, (err) => {
      callback(err, endpoints, services)
    })
  })
}

exports.getInstance = (endpoints, awsServiceName) => {
  return new AWS[awsServiceName]({
    region: 'us-east-1',
    endpoint: endpoints[awsServiceName]
  })
}

const getDeepVal = (obj, path) => {
  if (path.constructor === Function) {
    return path(obj)
  }

  let retval = obj
  for (var iItem in path) {
    let item = path[iItem]
    if (iItem === path.length - 1) {
      return retval
    } else {
      retval = (retval || {})[item]
    }
  }

  return retval
}

exports.crudMethod = (params, method) => {
  return function() {

  }
}

exports.testCrud = (test, opts) => {
  opts.crud = {}

  Object.keys(opts.methods).forEach((method, iMethod) => {
    opts.crud[method] = function(makeCall) {
      const config = opts.methods[method]
      const params = config.apply(null, arguments)
      const callback = arguments[arguments.length-1]

      if (params.results) {
        callback(null, params.results)
      } else if (params.constructor === Function) {
        params((err, finalParams) => {
          if (finalParams.results) {
            callback(null, finalParams.results)
          } else {
            makeCall(finalParams.method, finalParams.params, finalParams.context, callback)
          }
        })
      } else {
        makeCall(params.method, params.params, params.context, callback)
      }
    }
  })

  if (opts.crud.create) {
    exports.testCreateItem(test, opts)
  }

  if (opts.crud.create && opts.crud.list) {
    exports.testListItems(test, opts)
  }

  if (opts.crud.create && opts.crud.get) {
    exports.testGetItem(test, opts)
  }

  if (opts.crud.create && opts.crud.get && opts.crud.update) {
    exports.testUpdateItem(test, opts)
  }

  if (opts.crud.create && opts.crud.list && opts.crud.remove) {
    exports.testRemoveItem(test, opts)
  }

  return opts
}

exports.methodConfig = (testConfig, type, makeCall, callback) => {
  const config = testConfig.methods[type](makeCall)
  if (config.constructor === Function) {
    config(callback)
  } else {
    callback(null, config)
  }
}


exports.callCrud = (opts, type, endpoints, services, ...methodArgs) => {
  const makeCall = (method, params, context, callback) => {
    let [serviceName, functionName] = method

    const service = exports.getInstance(endpoints, serviceName)
    service[functionName](params, (err, results) => {
      log(serviceName, functionName, err, results, params)

      if (err) {
        callback(err)
      } else if (context) {
        callback(null, results, context(results))
      } else {
        callback(null, results)
      }
    })
  }

  opts.crud[type].call(null, makeCall, ...methodArgs)
}

exports.testCreateItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} create`
  const isOnly = opts.only === true || opts.only === 'create'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, (err, endpoints, services) => {
      opts.services = services
      opts.endpoints = endpoints

      exports.callCrud(opts, 'create', endpoints, services, (err, created) => {
        test.equal(err, null, 'should not emit an error')
        
        const resourceId = getDeepVal(created, opts.schema.id)
        test.notEqual(resourceId, undefined, 'should generate an id')
        
        exports.cleanup(test, services)
      })
    })
  })
}

exports.testUpdateItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} update`
  const isOnly = opts.only === true || opts.only === 'update'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, (err, endpoints, services) => {
      exports.callCrud(opts, 'create', endpoints, services, (err, created, context) => {
        const resourceId = getDeepVal(created, opts.schema.id)
        
        exports.callCrud(opts, 'update', endpoints, services, resourceId, context, (err, updated) => {
          exports.callCrud(opts, 'get', endpoints, services, resourceId, context, (err, found) => {
            test.equal(err, null, 'should not emit an error')

            for (var path of opts.updatePaths) {
              const original = getDeepVal(created, path)
              const updated = getDeepVal(found, path)
              test.notEqual(original, updated, `should have updated ${path.join('.')}`)
            }

            exports.cleanup(test, services)
          })
        })
      })
    })
  })
}

exports.testListItems = (test, opts) => {
  const name = `${opts.namespace.join(' ')} list`
  const isOnly = opts.only === true || opts.only === 'list'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, (err, endpoints, services) => {
      exports.callCrud(opts, 'create', endpoints, services, (err, created, context) => {
        exports.callCrud(opts, 'list', endpoints, services, context, (err, results) => {
          test.equal(err, null, 'should not emit an error')
          
          test.equal(results[opts.listPath].length, 1, 'should have one identity pool')
          
          for (var pool of results[opts.listPath]) {
            const poolId = getDeepVal(pool, opts.schema.id)

            test.notEqual(poolId, undefined, 'should retrieve pool ids')
          }

          exports.cleanup(test, services)
        })
      })
    })
  })
}

exports.testRemoveItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} remove`
  const isOnly = opts.only === true || opts.only === 'remove'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, (err, endpoints, services) => {
      async.waterfall([
        (done) => {
          exports.callCrud(opts, 'create', endpoints, services, (err, results, context) => {
            done(err, results, context)
          })
        },
        
        (results, context, done) => {
          exports.callCrud(opts, 'list', endpoints, services, context, (err, results) => {
            done(err, results, context)
          })
        },
        
        (results, context, done) => {
          const startPools = results[opts.listPath]
          
          test.equal(startPools.length, 1, 'should start with one pool')

          const itemId = getDeepVal(startPools[0], opts.schema.id)

          exports.callCrud(opts, 'remove', endpoints, services, itemId, context, (err, results) => {
            exports.callCrud(opts, 'list', endpoints, services, context, (err, results) => {
              const endPools = results[opts.listPath]
              done(err, startPools, endPools)
            })
          })
        },

      ], (err, startPools, endPools) => {
        test.equal(endPools.length, 0, 'should end with no pools')
        exports.cleanup(test, services)
      })
    })
  })
}

exports.testGetItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} get`
  const isOnly = opts.only === true || opts.only === 'get'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, (err, endpoints, services) => {
      exports.callCrud(opts, 'create', endpoints, services, (err, created, context) => {
        const createdId = getDeepVal(created, opts.schema.id)
      
        exports.callCrud(opts, 'get', endpoints, services, createdId, context, (err, results) => {
          test.equal(err, null, 'should not emit an error')
          
          const foundId = getDeepVal(results, opts.schema.id)

          test.equal(foundId, createdId, 'should retrieve an item with the same id we created')
          exports.cleanup(test, services)
        })
      })
    })
  })
}
