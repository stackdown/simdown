const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const CognitoIdentityServiceProvider = require('../../lib/services/cognito_identity_service_provider')

const userPoolConfig = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, id) => ({
      params: {
        UserPoolId: id
      },
      method: ['CognitoIdentityServiceProvider', 'describeUserPool']
    }),
    
    create: (makeCall, id) => ({
      params: {
        PoolName: 'test-user-pool',
        EmailVerificationMessage: 'original email message'
      },
      method: ['CognitoIdentityServiceProvider', 'createUserPool'],
    }),

    list: (makeCall, context) => ({
      params: {
        MaxResults: 0
      },
      method: ['CognitoIdentityServiceProvider', 'listUserPools']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        UserPoolId: id
      },
      method: ['CognitoIdentityServiceProvider', 'deleteUserPool']
    }),

    update: (makeCall, id, context) => ({
      params: {
        UserPoolId: id,
        EmailVerificationMessage: 'changed email message'
      },
      method: ['CognitoIdentityServiceProvider', 'updateUserPool']
    }),
  },
  listPath: 'UserPools',
  updatePaths: [
    ['UserPool', 'EmailVerificationMessage']
  ],
  schema: {
    id: (data) => {return data.UserPool ? data.UserPool.Id : data.Id}
    // id: ['UserPool', 'Id'],
  },
  Services: [CognitoIdentityServiceProvider],
  namespace: ['CognitoIdentityServiceProvider', 'userPool']
})

utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, id, context) => ({
      params: {
        ClientId: id,
        UserPoolId: context.pool,
      },
      method: ['CognitoIdentityServiceProvider', 'describeUserPoolClient']
    }),
    
    create: (makeCall) => ((callback) => {
      const callConfig = userPoolConfig.methods.create(makeCall)

      makeCall(callConfig.method, callConfig.params, null, (err, poolResults) => {
        callback(err, {
          params: {
            ClientName: 'test-user-pool-client',
            UserPoolId: poolResults ? poolResults.UserPool.Id : undefined,
          },
          method: ['CognitoIdentityServiceProvider', 'createUserPoolClient'],
          context: (results) => ({pool: poolResults.UserPool.Id})
        })
      })
    }),

    list: (makeCall, context) => ({
      params: {
        MaxResults: 0,
        UserPoolId: context.pool,
      },
      method: ['CognitoIdentityServiceProvider', 'listUserPoolClients']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        ClientId: id,
        UserPoolId: context.pool,
      },
      method: ['CognitoIdentityServiceProvider', 'deleteUserPoolClient']
    }),

    update: (makeCall, id, context) => ({
      params: {
        ClientId: id,
        UserPoolId: context.pool,
        ClientName: 'test-user-pool-client-updated',
      },
      method: ['CognitoIdentityServiceProvider', 'updateUserPoolClient']
    }),

  },
  listPath: 'UserPoolClients',
  updatePaths: [
    ['UserPoolClient', 'ClientName']
  ],
  schema: {
    id: (data) => {return data.UserPoolClient ? data.UserPoolClient.ClientId : data.ClientId}
  },
  Services: [CognitoIdentityServiceProvider],
  namespace: ['CognitoIdentityServiceProvider', 'userPoolClient']
})
