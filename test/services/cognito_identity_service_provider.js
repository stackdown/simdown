const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const CognitoIdentityServiceProvider = require('../../lib/services/cognito_identity_service_provider')

function createUserPool(provider, callback) {
  const params = {
    PoolName: 'test-user-pool'
  }

  provider.createUserPool(params, function(err, results) {
    callback(err, results)
  })
}

function getUserPool(provider, poolId, callback) {
  const params = {
    UserPoolId: 'test-user-pool'
  }

  provider.describeUserPool(params, function(err, results) {
    callback(err, results)
  })
}

test('CognitoIdentityServiceProvider createIdentityPool', (test) => {
  utils.setup([CognitoIdentityServiceProvider], function(err, endpoints, services) {
    const provider = utils.getInstance(endpoints, 'CognitoIdentityServiceProvider')

    createUserPool(provider, function(err, results) {
      test.equal(err, null, 'should not emit an error')
      test.notEqual(results.UserPool.Id, undefined, 'should generate an id')
      test.equal(results.UserPool.Name, 'test-user-pool', 'should send back the right pool name')
      utils.cleanup(test, services)
    })
  })
})