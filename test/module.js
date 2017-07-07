const test = require('tape')
const SimDown = require('../')

test('module tests', (test) => {
  const simdown = new SimDown()

  simdown.setup((err, endpoints) => {
    simdown.stop(() => {
      test.equal(err, null, 'should setup without error')
      test.equal(Object.keys(endpoints).length, 3, 'should setup an endpoint for all services')
      test.equal(Object.keys(simdown.Services).length, 3, 'should load the full list of services')
      
      let endpointsChecker = {}
      for (endpoint in endpoints) {
        endpointsChecker[endpoint] = true
      }

      test.equal(Object.keys(endpoints).length, Object.keys(endpointsChecker).length, 'all endpoints should have unique endpoints')

      test.end()
    })
  })

})