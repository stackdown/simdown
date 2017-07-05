const AWS = require('aws-sdk')
const async = require('async')
const dbutil = require('../lib/dbutil')

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

exports.testCrud = (test, opts) => {
  exports.testGetItem(test, opts)
  exports.testListItems(test, opts)
  exports.testCreateItem(test, opts)
  exports.testUpdateItem(test, opts)
  exports.testRemoveItem(test, opts)
}

exports.testCreateItem = (test, opts) => {
  const name = `${opts.namespace.join(' ')} create`
  const isOnly = opts.only === true || opts.only === 'create'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, (err, endpoints, services) => {
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, (err, created) => {
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
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, (err, created, context) => {
        const resourceId = getDeepVal(created, opts.schema.id)
        opts.crud.update(service, resourceId, context, (err, updated) => {

          opts.crud.get(service, resourceId, context, (err, found) => {
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
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, (err, created, context) => {
        opts.crud.list(service, context, (err, results) => {
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
      const service = exports.getInstance(endpoints, opts.namespace[0])

      async.waterfall([
        (done) => {
          opts.crud.create(service, (err, results, context) => {
            done(err, results, context)
          })
        },
        
        (results, context, done) => {
          opts.crud.list(service, context, (err, results) => {
            done(err, results, context)
          })
        },
        
        (results, context, done) => {
          const startPools = results[opts.listPath]
          
          test.equal(startPools.length, 1, 'should start with one pool')

          const poolId = getDeepVal(startPools[0], opts.schema.id)

          opts.crud.remove(service, poolId, context, (err) => {
            opts.crud.list(service, context, (err, results) => {
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
      const service = exports.getInstance(endpoints, opts.namespace[0])
      opts.crud.create(service, (err, created, context) => {
        const createdId = getDeepVal(created, opts.schema.id)
        opts.crud.get(service, createdId, context, (err, results) => {
          test.equal(err, null, 'should not emit an error')
          
          const foundId = getDeepVal(results, opts.schema.id)

          test.equal(foundId, createdId, 'should retrieve an item with the same id we created')
          exports.cleanup(test, services)
        })
      })
    })
  })
}
