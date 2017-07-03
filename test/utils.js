const AWS = require('aws-sdk')
const async = require('async')
const dbutil = require('../lib/dbutil')

exports.cleanup = function(test, services) {
  async.each(services, function(service, next) {
    service.stop(function() {
      next()
    })
  }, function(err) {
    test.end()
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