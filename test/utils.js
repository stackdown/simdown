const AWS = require('aws-sdk')
const imap = require('imap')
const async = require('async')
const debug = require('debug')
const extend = require('extend')
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

exports.setup = (opts, callback) => {
  let endpoints = {}
  let services = {}

  dbutil.setup((err, db) => {
    async.each(opts.Services, (Service, next) => {
      const service = new Service({hooks: opts.hooks})
      services[service.constructor.name] = service
      service.setup(db, {}, (err, endpoint) => {
        endpoints[service.constructor.name] = endpoint
        next(err)
      })
    }, (err) => {
      if (err) {
        return callback(err)
      }

      const makeCall = (method, params, context, done) => {
        let [serviceName, functionName] = method

        const awsService = exports.getInstance(endpoints, serviceName)
        log(serviceName, functionName, 'endpoint', opts.endpoints)
        log(serviceName, functionName, 'params', JSON.stringify(params))

        if (err) {return done(err)}

        if (awsService[functionName] === undefined) {
          return done(`${serviceName} has no method ${functionName}`)
        }

        awsService[functionName](params, (err, results) => {
          log(serviceName, functionName, 'results', err, results)

          if (err) {
            done(err)
          } else if (context) {
            done(null, results, context(results))
          } else {
            done(null, results)
          }
        })
      }

      opts.makeCall = makeCall
      opts.services = services
      opts.endpoints = endpoints

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

exports.getFinalParams = (test, params, callback) => {
  if (params.params.constructor === Function) {
    params.params(test, (err, finalParams) => {
      extend(true, params, finalParams)
      exports.getFinalParams(test, params, callback)
    })
  } else {
    callback(null, params)
  }
}

exports.testCrud = (test, opts) => {
  opts.crud = {}

  Object.keys(opts.methods).forEach((method, iMethod) => {
    opts.crud[method] = function(test, makeCall, ...args) {
      const config = opts.methods[method]
      const params = config(makeCall, ...args)
      const callback = arguments[arguments.length-1]

      exports.getFinalParams(test, params, (err, finalParams) => {
        if (finalParams.results) {
          callback(null, finalParams.results)
        } else {
          makeCall(finalParams.method, finalParams.params, finalParams.context, callback)
        }
      })
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

exports.callCrud = (test, opts, type, ...methodArgs) => {
  opts.crud[type](test, opts.makeCall, ...methodArgs)
}

exports.testCreateItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} create`
  const isOnly = opts.only === true || opts.only === 'create'
  const testFn = isOnly ? test.only : test

  let hasBefore = false
  let hasAfter = false
  const beforeFn = (path, report, done) => {hasBefore = true; done()}
  const afterFn = (path, report, done) => {hasAfter = true; done()}

  testFn(name, (test) => {
    const method = opts.methods.create().method

    opts.hooks = {}
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:before`] = beforeFn
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:after`] = afterFn

    exports.setup(opts, (err, endpoints, services) => {

      exports.callCrud(test, opts, 'create', (err, created) => {
        test.equal(err, null, 'should not emit an error')
        
        const schemaId = exports.getId(opts, 'create')
        const resourceId = getDeepVal(created, schemaId)
        test.notEqual(resourceId, undefined, 'should generate an id')
        
        test.equal(hasBefore, true, 'should call before hook')
        test.equal(hasAfter, true, 'should call after hook')
        
        exports.cleanup(test, services)
      })
    })
  })
}

exports.testUpdateItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} update`
  const isOnly = opts.only === true || opts.only === 'update'
  const testFn = isOnly ? test.only : test

  let hasBefore = false
  let hasAfter = false
  const beforeFn = (path, report, done) => {hasBefore = true; done()}
  const afterFn = (path, report, done) => {hasAfter = true; done()}

  testFn(name, (test) => {
    const method = opts.methods.create().method

    opts.hooks = {}
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:before`] = beforeFn
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:after`] = afterFn

    exports.setup(opts, (err, endpoints, services) => {
      exports.callCrud(test, opts, 'create', (err, created, context) => {
        const schemaId = exports.getId(opts, 'update')
        const resourceId = getDeepVal(created, schemaId)
        
        exports.callCrud(test, opts, 'update', resourceId, context, (err, updated) => {
          exports.callCrud(test, opts, 'get', resourceId, context, (err, found) => {
            test.equal(err, null, 'should not emit an error')

            for (var path of opts.updatePaths) {
              const original = getDeepVal(created, path)
              const updated = getDeepVal(found, path)
              test.notEqual(original, updated, `should have updated ${path.join('.')}`)
            }

            test.equal(hasBefore, true, 'should call before hook')
            test.equal(hasAfter, true, 'should call after hook')

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

  let hasBefore = false
  let hasAfter = false
  const beforeFn = (path, report, done) => {hasBefore = true; done()}
  const afterFn = (path, report, done) => {hasAfter = true; done()}

  testFn(name, (test) => {
    const method = opts.methods.create().method

    opts.hooks = {}
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:before`] = beforeFn
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:after`] = afterFn

    exports.setup(opts, (err, endpoints, services) => {
      exports.callCrud(test, opts, 'create', (err, created, context) => {
        exports.callCrud(test, opts, 'list', context, (err, results) => {
          test.equal(err, null, 'should not emit an error')

          const totalItems = opts.baseCount === undefined ? 1 : opts.baseCount + 1
          
          test.equal(results[opts.listPath].length, totalItems, 'should have the right number of items')
          
          const schemaId = exports.getId(opts, 'list')
          for (var pool of results[opts.listPath]) {
            const poolId = getDeepVal(pool, schemaId)

            test.notEqual(poolId, undefined, 'should retrieve pool ids')
          }

          test.equal(hasBefore, true, 'should call before hook')
          test.equal(hasAfter, true, 'should call after hook')

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

  let hasBefore = false
  let hasAfter = false
  const beforeFn = (path, report, done) => {hasBefore = true; done()}
  const afterFn = (path, report, done) => {hasAfter = true; done()}

  testFn(name, (test) => {
    const method = opts.methods.create().method

    opts.hooks = {}
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:before`] = beforeFn
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:after`] = afterFn

    exports.setup(opts, (err, endpoints, services) => {
      async.waterfall([
        (done) => {
          exports.callCrud(test, opts, 'create', (err, results, context) => {
            done(err, results, context)
          })
        },
        
        (results, context, done) => {
          exports.callCrud(test, opts, 'list', context, (err, results) => {
            done(err, results, context)
          })
        },
        
        (results, context, done) => {
          const startitems = results[opts.listPath]
          const totalItems = opts.baseCount === undefined ? 1 : opts.baseCount + 1

          test.equal(startitems.length, totalItems, 'should start with the right number of items')

          const schemaId = exports.getId(opts, 'remove')
          const itemId = getDeepVal(startitems[0], schemaId)

          exports.callCrud(test, opts, 'remove', itemId, context, (err, results) => {
            exports.callCrud(test, opts, 'list', context, (err, results) => {
              const endItems = results[opts.listPath]
              done(err, startitems, endItems)
            })
          })
        },

      ], (err, startitems, endItems) => {
        test.equal(endItems.length, opts.baseCount || 0, 'should end with no extra items')
        
        test.equal(hasBefore, true, 'should call before hook')
        test.equal(hasAfter, true, 'should call after hook')

        exports.cleanup(test, services)
      })
    })
  })
}

exports.testGetItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} get`
  const isOnly = opts.only === true || opts.only === 'get'
  const testFn = isOnly ? test.only : test

  let hasBefore = false
  let hasAfter = false
  const beforeFn = (path, report, done) => {hasBefore = true; done()}
  const afterFn = (path, report, done) => {hasAfter = true; done()}

  testFn(name, (test) => {
    const method = opts.methods.create().method

    opts.hooks = {}
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:before`] = beforeFn
    opts.hooks[`${method[0]}:${method[1].charAt(0).toUpperCase() + method[1].slice(1)}:after`] = afterFn

    exports.setup(opts, (err, endpoints, services) => {
      const schemaId = exports.getId(opts, 'get')

      exports.callCrud(test, opts, 'create', (err, created, context) => {
        const createdId = getDeepVal(created, schemaId)
        
        exports.callCrud(test, opts, 'get', createdId, context, (err, results) => {
          test.equal(err, null, 'should not emit an error')
          
          const foundId = getDeepVal(results, schemaId)
          test.equal(foundId, createdId, 'should retrieve an item with the same id we created')
          
          test.equal(hasBefore, true, 'should call before hook')
          test.equal(hasAfter, true, 'should call after hook')

          exports.cleanup(test, services)
        })
      })
    })
  })
}

exports.getId = (opts, testType) => {
  if (opts.schema.constructor === Function) {
    return opts.schema(testType).id
  } else {
    return opts.schema.id
  }
}