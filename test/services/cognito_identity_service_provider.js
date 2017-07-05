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

function updateUserPool(cognito, poolId, context, callback) {
  const params = {
    UserPoolId: poolId,
    EmailVerificationMessage: 'changed email message'
  }

  cognito.updateUserPool(params, function(err, results) {
    callback(err, results)
  })
}

function listUserPools(cognito, context, callback) {
  const params = {
    MaxResults: 0
  }

  cognito.listUserPools(params, function(err, results) {
    callback(err, results)
  })
}

function deleteUserPool(cognito, poolId, context, callback) {
  const params = {
    UserPoolId: poolId
  }

  cognito.deleteUserPool(params, function(err, results) {
    callback(err, results)
  })
}

function getUserPool(provider, poolId, context, callback) {
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

function createUserPoolClient(provider, callback) {
  createUserPool(provider, function(err, results) {
    const params = {
      ClientName: 'test-user-pool-client',
      UserPoolId: results.UserPool.Id,
    }

    provider.createUserPoolClient(params, function(err, results) {
      callback(err, results)
    })
  })
}

function updateUserPoolClient(cognito, poolId, context, callback) {
  const params = {
    UserPoolId: poolId,
    EmailVerificationMessage: 'changed email message'
  }

  cognito.updateUserPoolClient(params, function(err, results) {
    callback(err, results)
  })
}

function listUserPoolClients(cognito, context, callback) {
  const params = {
    MaxResults: 0
  }

  cognito.listUserPoolClients(params, function(err, results) {
    callback(err, results)
  })
}

function deleteUserPoolClient(cognito, poolId, context, callback) {
  const params = {
    UserPoolId: poolId
  }

  cognito.deleteUserPoolClient(params, function(err, results) {
    callback(err, results)
  })
}

function getUserPoolClient(provider, poolId, context, callback) {
  const params = {
    UserPoolId: poolId
  }

  provider.describeUserPoolClient(params, function(err, results) {
    callback(err, results)
  })
}

utils.testCrud(test, userPoolTestOpts)
