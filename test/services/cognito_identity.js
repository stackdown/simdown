var AWS = require('aws-sdk')
var test = require('tape')
var utils = require('../utils')
var CognitoIdentityService = require('../../lib/services/cognito_identity')

test('CognitoIdentity createIdentityPool', (test) => {
  utils.setup([CognitoIdentityService], function(err, endpoints, services) {
    const cognito = utils.getInstance(endpoints, 'CognitoIdentity')

    const params = {
      AllowUnauthenticatedIdentities: true,
      IdentityPoolName: 'test-pool'
    }

    cognito.createIdentityPool(params, function(err, results) {
      test.equal(err, null, 'should not emit an error')
      test.notEqual(results.IdentityPoolId, undefined, 'should generate an IdentityPoolId')
      test.equal(results.IdentityPoolName, 'test-pool', 'should send back the right pool name')
      utils.cleanup(test, services)
    })
  })
})

test('CognitoIdentity listIdentityPools', (test) => {
  utils.setup([CognitoIdentityService], function(err, endpoints, services) {
    const cognito = utils.getInstance(endpoints, 'CognitoIdentity')

    const params = {
      AllowUnauthenticatedIdentities: true,
      IdentityPoolName: 'test-pool'
    }

    cognito.createIdentityPool(params, function(err, results) {
      const params = {
        MaxResults: 0
      }

      cognito.listIdentityPools(params, function(err, results) {

        test.equal(err, null, 'should not emit an error')
        test.equal(results.IdentityPools.length, 1, 'should have one identity pool')
        
        for (var pool of results.IdentityPools) {
          test.notEqual(pool.IdentityPoolId, undefined, 'should retrieve pool ids')
          test.equal(pool.IdentityPoolName, 'test-pool', 'should retrieve pool names')
        }

        utils.cleanup(test, services)
      })
    })
  })
})
