const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const emailutil = require ('../../lib/emailutil')
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
  },
  Services: [CognitoIdentityServiceProvider],
  namespace: ['CognitoIdentityServiceProvider', 'userPool']
})

const userPoolClientConfig = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, id, context) => ({
      params: {
        ClientId: id,
        UserPoolId: context.pool,
      },
      method: ['CognitoIdentityServiceProvider', 'describeUserPoolClient']
    }),
    
    create: (makeCall) => ((test, callback) => {
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

utils.testCrud(test, {
  // only: 'create',
  methods: {
    create: (makeCall) => ((test, callback) => {
      // Create a user pool
      const poolConfig = userPoolConfig.methods.create(makeCall)
      makeCall(poolConfig.method, poolConfig.params, null, (err, poolResults) => {
        
        // Get the method to create a user pool client
        const thunk = userPoolClientConfig.methods.create(makeCall)

        thunk(test, (err, poolClientConfig) => {
          
          // Create a user pool client
          makeCall(poolClientConfig.method, poolClientConfig.params, null, (err, poolClientResults) => {
            let signUpResults = undefined
            const signUpParams = {
              Username: 'testuser1234',
              Password: 'Amazingpass123.',
              ClientId: poolClientResults.UserPoolClient.ClientId,
              UserAttributes: [
                {
                  Name: 'email',
                  Value: 'test@localhost'
                }
              ]
            }

            // Wait for a confirmation email
            let hasGottenEmail = false
            emailutil.waitForEmail((err, emailText) => {
              hasGottenEmail = true
              test.equal(true, true, 'should recieve confirmation email')

              const lines = emailText.trim().split('\n')
              const splitText = lines[lines.length - 1].split(' ')
              const confirmCode = splitText[splitText.length - 1]

              const confirmParams = {
                Username: 'testuser1234',
                ClientId: poolClientResults.UserPoolClient.ClientId,
                ConfirmationCode: confirmCode,
              }

              makeCall(['CognitoIdentityServiceProvider', 'confirmSignUp'], confirmParams, null, (err, finalResults) => {
                test.equal(err, null, 'should confirm sign up without error')                
                callback(null, {results: signUpResults})
              })
            })

            // Sign up a new user
            makeCall(['CognitoIdentityServiceProvider', 'signUp'], signUpParams, null, (err, results) => {
              test.equal(err, null, 'should sign up without error')
              signUpResults = results
            })

            // If we fail to recieve the email within 2 seconds, give up and fail
            setTimeout(() => {
              if (!hasGottenEmail) {
                test.equal(true, false, 'should recieve confirmation email')
                callback("Failed to recieve confirmation email")
              }
            }, 2000)
          })
        })
      })
    }),

    // get: (makeCall, id, context) => ({
    //   params: {
    //     ClientId: id,
    //     UserPoolId: context.pool,
    //   },
    //   method: ['CognitoIdentityServiceProvider', 'describeUserPoolClient']
    // }),

    // list: (makeCall, context) => ({
    //   params: {
    //     MaxResults: 0,
    //     UserPoolId: context.pool,
    //   },
    //   method: ['CognitoIdentityServiceProvider', 'listUserPoolClients']
    // }),

    // remove: (makeCall, id, context) => ({
    //   params: {
    //     ClientId: id,
    //     UserPoolId: context.pool,
    //   },
    //   method: ['CognitoIdentityServiceProvider', 'deleteUserPoolClient']
    // }),

    // update: (makeCall, id, context) => ({
    //   params: {
    //     ClientId: id,
    //     UserPoolId: context.pool,
    //     ClientName: 'test-user-pool-client-updated',
    //   },
    //   method: ['CognitoIdentityServiceProvider', 'updateUserPoolClient']
    // }),

  },
  listPath: 'UserPoolClients',
  updatePaths: [
    ['UserPoolClient', 'ClientName']
  ],
  schema: {
    id: (data) => {return data.UserSub}
  },
  Services: [CognitoIdentityServiceProvider],
  namespace: ['CognitoIdentityServiceProvider', 'user']
})
