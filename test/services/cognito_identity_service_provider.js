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

function createUserPoolClient(provider, callback) {
  createUserPool(provider, function(err, poolResults) {
    const params = {
      ClientName: 'test-user-pool-client',
      UserPoolId: poolResults.UserPool.Id,
    }

    provider.createUserPoolClient(params, function(err, results) {
      callback(err, results, {pool: poolResults.UserPool.Id})
    })
  })
}

function updateUserPoolClient(cognito, poolId, context, callback) {
  const params = {
    ClientId: poolId,
    UserPoolId: context.pool,
    ClientName: 'test-user-pool-client-updated',
  }

  cognito.updateUserPoolClient(params, function(err, results) {
    callback(err, results)
  })
}

function listUserPoolClients(cognito, context, callback) {
  const params = {
    MaxResults: 0,
    UserPoolId: context.pool,
  }

  cognito.listUserPoolClients(params, function(err, results) {
    callback(err, results)
  })
}

function deleteUserPoolClient(cognito, clientId, context, callback) {
  const params = {
    ClientId: clientId,
    UserPoolId: context.pool,
  }

  cognito.deleteUserPoolClient(params, function(err, results) {
    callback(err, results)
  })
}

function getUserPoolClient(provider, clientId, context, callback) {
  const params = {
    ClientId: clientId,
    UserPoolId: context.pool,
  }

  provider.describeUserPoolClient(params, function(err, results) {
    callback(err, results)
  })
}

utils.testCrud(test, {
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
})

utils.testCrud(test, {
  // only: 'remove',
  crud: {
    get: getUserPoolClient,
    list: listUserPoolClients,
    create: createUserPoolClient,
    remove: deleteUserPoolClient,
    update: updateUserPoolClient,
  },
  listPath: 'UserPoolClients',
  updatePaths: [
    ['UserPoolClient', 'ClientName']
  ],
  schema: {
    id: function(data) {return data.UserPoolClient ? data.UserPoolClient.ClientId : data.ClientId}
  },
  Services: [CognitoIdentityServiceProvider],
  namespace: ['CognitoIdentityServiceProvider', 'userPoolClient']
})
