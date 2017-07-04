const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const CognitoIdentityServiceProvider = require('../../lib/services/cognito_identity_service_provider')

function createUserPool(provider, callback) {
  const params = {
    PoolName: 'test-user-pool',
    EmailVerificationMessage: 'original email message'
  }

  provider.createUserPool(params, function(err, results) {
    callback(err, results)
  })
}

function updateUserPool(cognito, poolId, callback) {
  const params = {
    UserPoolId: poolId,
    EmailVerificationMessage: 'changed email message'
  }

  cognito.updateUserPool(params, function(err, results) {
    callback(err, results)
  })
}

function listUserPools(cognito, callback) {
  const params = {
    MaxResults: 0
  }

  cognito.listUserPools(params, function(err, results) {
    callback(err, results)
  })
}

function deleteUserPool(cognito, poolId, callback) {
  const params = {
    UserPoolId: poolId
  }

  cognito.deleteUserPool(params, function(err, results) {
    callback(err, results)
  })
}

function getUserPool(provider, poolId, callback) {
  const params = {
    UserPoolId: poolId
  }

  provider.describeUserPool(params, function(err, results) {
    callback(err, results)
  })
}

const userPoolTestOpts = {
  // only: 'list',
  crud: {
    get: getUserPool,
    list: listUserPools,
    create: createUserPool,
    remove: deleteUserPool,
    update: updateUserPool,
  },
  listPath: 'UserPools',
  updatePaths: [
    ['UserPool', 'EmailVerificationMessage']
  ],
  schema: {
    id: function(data) {return data.UserPool ? data.UserPool.Id : data.Id}
    // id: ['UserPool', 'Id'],
  },
  Services: [CognitoIdentityServiceProvider],
  namespace: ['CognitoIdentityServiceProvider', 'userPool']
}

utils.testCrud(test, userPoolTestOpts)

// test('CognitoIdentityServiceProvider createIdentityPool', (test) => {
//   utils.setup([CognitoIdentityServiceProvider], function(err, endpoints, services) {
//     const provider = utils.getInstance(endpoints, 'CognitoIdentityServiceProvider')

//     createUserPool(provider, function(err, results) {
//       test.equal(err, null, 'should not emit an error')
//       test.notEqual(results.UserPool.Id, undefined, 'should generate an id')
//       test.equal(results.UserPool.Name, 'test-user-pool', 'should send back the right pool name')
//       utils.cleanup(test, services)
//     })
//   })
// })