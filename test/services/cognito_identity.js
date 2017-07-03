const AWS = require('aws-sdk')
const test = require('tape')
const utils = require('../utils')
const async = require('async')
const CognitoIdentityService = require('../../lib/services/cognito_identity')

function createPool(cognito, callback) {
  const params = {
    AllowUnauthenticatedIdentities: true,
    IdentityPoolName: 'test-pool'
  }

  cognito.createIdentityPool(params, function(err, results) {
    callback(err, results)
  })
}

function listPools(cognito, callback) {
  const params = {
    MaxResults: 0
  }

  cognito.listIdentityPools(params, function(err, results) {
    callback(err, results)
  })
}

function deletePool(cognito, poolId, callback) {
  const params = {
    IdentityPoolId: poolId
  }

  cognito.deleteIdentityPool(params, function(err, results) {
    callback(err, results)
  })
}

test('CognitoIdentity createIdentityPool', (test) => {
  utils.setup([CognitoIdentityService], function(err, endpoints, services) {
    const cognito = utils.getInstance(endpoints, 'CognitoIdentity')

    createPool(cognito, function(err, results) {
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

    createPool(cognito, function(err, results) {
      listPools(cognito, function(err, results) {
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

test('CognitoIdentity deleteIdentityPool', (test) => {
  utils.setup([CognitoIdentityService], function(err, endpoints, services) {
    const cognito = utils.getInstance(endpoints, 'CognitoIdentity')

    async.waterfall([
      function(done) {
        createPool(cognito, done)
      },
      
      function(results, done) {
        listPools(cognito, done)
      },
      
      function(results, done) {
        const startPools = results.IdentityPools
        deletePool(cognito, startPools[0].IdentityPoolId, function(err) {
          listPools(cognito, function(err, results) {
            const endPools = results.IdentityPools
            done(err, startPools, endPools)
          })
        })
      },

    ], function(err, startPools, endPools) {
      test.equal(startPools.length, 1, 'should start with one pool')
      test.equal(endPools.length, 0, 'should end with no pools')
      utils.cleanup(test, services)
    })
  })
})

test('CognitoIdentity describeIdentityPool', (test) => {
  utils.setup([CognitoIdentityService], function(err, endpoints, services) {
    const cognito = utils.getInstance(endpoints, 'CognitoIdentity')

    createPool(cognito, function(err, results) {
      const params = {
        IdentityPoolId: results.IdentityPoolId
      }

      cognito.describeIdentityPool(params, function(err, results) {
        test.equal(err, null, 'should not emit an error')
        test.notEqual(results.IdentityPoolId, undefined, 'should retrieve the IdentityPoolId')
        test.equal(results.IdentityPoolName, 'test-pool', 'should retrieve the pool name')
        utils.cleanup(test, services)
      })
    })
  })
})
