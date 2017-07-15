const test = require('tape')
const SimDown = require('../')

test('module tests', (test) => {
  const simdown = new SimDown()

  simdown.setup({}, (err, endpoints) => {
    simdown.stop(() => {
      test.equal(err, null, 'should setup without error')
      test.equal(Object.keys(endpoints).length, Object.keys(simdown.Services).length, 'should setup an endpoint for all services')
      
      let endpointsChecker = {}
      for (endpoint in endpoints) {
        endpointsChecker[endpoint] = true
      }

      test.equal(Object.keys(endpoints).length, Object.keys(endpointsChecker).length, 'all endpoints should have unique endpoints')

      test.end()
    })
  })

})