const async = require('async')

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

  async.each(Services, function(Service, next) {
    const service = new Service()
    services.push(service)
    
    service.setup({}, function(err, endpoint) {
      endpoints[service.constructor.name] = endpoint
      next(err)
    })
  }, function(err) {
    callback(err, endpoints, services)
  })  
}