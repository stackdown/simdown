const AWS = require('aws-sdk')
const async = require('async')
const dbutil = require('../lib/dbutil')

exports.cleanup = function(test, services) {
  async.each(services, function(service, next) {
    service.stop(function() {
      next()
    })
  }, function(err) {
    dbutil.cleanup(function() {
      test.end()
    })
  })
}

exports.setup = function(Services, callback) {
  let endpoints = {}
  let services = []

  dbutil.setup(function(err, db) {
    async.each(Services, function(Service, next) {
      const service = new Service()
      services.push(service)

      service.setup(db, {}, function(err, endpoint) {
        endpoints[service.constructor.name] = endpoint
        next(err)
      })
    }, function(err) {
      callback(err, endpoints, services)
    })
  })
}

exports.getInstance = function(endpoints, awsServiceName) {
  return new AWS[awsServiceName]({
    region: 'us-east-1',
    endpoint: endpoints[awsServiceName]
  })
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

exports.testCrud = function(test, opts) {
  exports.testGetItem(test, opts)
  exports.testListItems(test, opts)
  exports.testCreateItem(test, opts)
  exports.testUpdateItem(test, opts)
  exports.testRemoveItem(test, opts)
}

exports.testCreateItem = function(test, opts) {
  const name = `${opts.namespace.join(' ')} create`
  const isOnly = opts.only === true || opts.only === 'create'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, function(err, endpoints, services) {
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, function(err, results) {
        test.equal(err, null, 'should not emit an error')
        test.notEqual(results[opts.schema.id], undefined, 'should generate an IdentityPoolId')
        exports.cleanup(test, services)
      })
    })
  })
}

exports.testUpdateItem = function(test, opts) {
  const name = `${opts.namespace.join(' ')} update`
  const isOnly = opts.only === true || opts.only === 'update'
  const testFn = isOnly ? test.only : test

  testFn(name, (test) => {
    exports.setup(opts.Services, function(err, endpoints, services) {
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, function(err, created) {
        const resourceId = created[opts.schema.id]

        opts.crud.update(service, resourceId, function(err, results) {
          opts.crud.get(service, resourceId, function(err, results) {
            test.equal(err, null, 'should not emit an error')

            for (var path of opts.updatePaths) {
              const original = getDeepVal(created, path)
              const updated = getDeepVal(results, path)
              test.notEqual(original, updated, `should have updated ${path.join('.')}`)
            }

            exports.cleanup(test, services)
          })
        })
      })
    })
  })
}

exports.testListItems = function(test, opts) {
  const name = `${opts.namespace.join(' ')} list`
  const isOnly = opts.only === true || opts.only === 'list'
  const testFn = isOnly ? test.only : test

  test(name, (test) => {
    exports.setup(opts.Services, function(err, endpoints, services) {
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, function(err, results) {
        opts.crud.list(service, function(err, results) {
          test.equal(err, null, 'should not emit an error')
          
          test.equal(results[opts.listPath].length, 1, 'should have one identity pool')
          
          for (var pool of results[opts.listPath]) {
            test.notEqual(pool[opts.schema.id], undefined, 'should retrieve pool ids')
          }

          exports.cleanup(test, services)
        })
      })
    })
  })
}

exports.testRemoveItem = function(test, opts) {
  const name = `${opts.namespace.join(' ')} remove`
  const isOnly = opts.only === true || opts.only === 'remove'
  const testFn = isOnly ? test.only : test

  test(name, (test) => {
    exports.setup(opts.Services, function(err, endpoints, services) {
      const service = exports.getInstance(endpoints, opts.namespace[0])

      async.waterfall([
        function(done) {
          opts.crud.create(service, done)
        },
        
        function(results, done) {
          opts.crud.list(service, done)
        },
        
        function(results, done) {
          const startPools = results[opts.listPath]

          opts.crud.remove(service, startPools[0][opts.schema.id], function(err) {
            opts.crud.list(service, function(err, results) {
              const endPools = results[opts.listPath]
              done(err, startPools, endPools)
            })
          })
        },

      ], function(err, startPools, endPools) {
        test.equal(startPools.length, 1, 'should start with one pool')
        test.equal(endPools.length, 0, 'should end with no pools')
        exports.cleanup(test, services)
      })
    })
  })
}

exports.testGetItem = function(test, opts) {
  const name = `${opts.namespace.join(' ')} remove`
  const isOnly = opts.only === true || opts.only === 'remove'
  const testFn = isOnly ? test.only : test

  test(name, (test) => {
    exports.setup(opts.Services, function(err, endpoints, services) {
      const service = exports.getInstance(endpoints, opts.namespace[0])

      opts.crud.create(service, function(err, created) {
        
        opts.crud.get(service, created[opts.schema.id], function(err, results) {
          test.equal(err, null, 'should not emit an error')
          test.equal(results[opts.schema.id], created[opts.schema.id], 'should retrieve an item with an id')
          exports.cleanup(test, services)
        })
      })
    })
  })
}