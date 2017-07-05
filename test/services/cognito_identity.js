const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const CognitoIdentityService = require('../../lib/services/cognito_identity')

function createPool(cognito, callback) {
  const params = {
    AllowUnauthenticatedIdentities: true,
    IdentityPoolName: 'test-pool'
  }

  cognito.createIdentityPool(params, (err, results) => {
    callback(err, results)
  })
}

function listPools(cognito, context, callback) {
  const params = {
    MaxResults: 0
  }

  cognito.listIdentityPools(params, (err, results) => {
    callback(err, results)
  })
}

function deletePool(cognito, poolId, context, callback) {
  const params = {
    IdentityPoolId: poolId
  }

  cognito.deleteIdentityPool(params, (err, results) => {
    callback(err, results)
  })
}

function getPool(cognito, poolId, context, callback) {
  const params = {
    IdentityPoolId: poolId
  }

  cognito.describeIdentityPool(params, (err, results) => {
    callback(err, results)
  })
}

function updatePool(cognito, poolId, context, callback) {
  // Change to no longer allow authenticated identities
  const params = {
    IdentityPoolId: poolId,
    IdentityPoolName: 'test-pool',
    AllowUnauthenticatedIdentities: false
  }

  cognito.updateIdentityPool(params, (err, results) => {
    callback(err, results)
  })
}

const identityPoolTestOpts = {
  // only: 'list',
  crud: {
    get: getPool,
    list: listPools,
    create: createPool,
    remove: deletePool,
    update: updatePool,
  },
  listPath: 'IdentityPools',
  updatePaths: [
    ['AllowUnauthenticatedIdentities']
  ],
  schema: {
    id: ['IdentityPoolId'],
  },
  Services: [CognitoIdentityService],
  namespace: ['CognitoIdentity', 'identityPool']
}

utils.testCrud(test, identityPoolTestOpts)
