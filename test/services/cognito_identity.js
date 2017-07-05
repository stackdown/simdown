const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const CognitoIdentityService = require('../../lib/services/cognito_identity')

const identityPoolTestOpts = utils.testCrud(test, {
  // only: 'update',
  methods: {
    get: (makeCall, id) => ({
      params: {
        IdentityPoolId: id
      },
      method: ['CognitoIdentity', 'describeIdentityPool']
    }),
    
    create: (makeCall, id) => ({
      params: {
        AllowUnauthenticatedIdentities: true,
        IdentityPoolName: 'test-pool'
      },
      method: ['CognitoIdentity', 'createIdentityPool']
    }),

    list: (makeCall, context) => ({
      params: {
        MaxResults: 0
      },
      method: ['CognitoIdentity', 'listIdentityPools']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        IdentityPoolId: id
      },
      method: ['CognitoIdentity', 'deleteIdentityPool']
    }),

    update: (makeCall, id, context) => ({
      params: {
        IdentityPoolId: id,
        IdentityPoolName: 'test-pool',
        AllowUnauthenticatedIdentities: false
      },
      method: ['CognitoIdentity', 'updateIdentityPool']
    }),
    
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
})