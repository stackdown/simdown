const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const emailutil = require ('../../lib/emailutil')
const CognitoIdentityServiceProvider = require('../../lib/services/cognito_identity_service_provider')

const {
  CognitoUser,
  CognitoUserPool,
  CognitoUserAttribute,
  AuthenticationDetails,
} = require('../../node_modules/amazon-cognito-identity-js/dist/amazon-cognito-identity')

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

test('should put a user through a sign up and sign in flows', (test) => {
  let opts = {
    Services: [CognitoIdentityServiceProvider]
  }

  utils.setup(opts, (err, endpoints, services) => {
    const makeCall = opts.makeCall

    async.waterfall([
      // Create a user pool
      (done) => {
        const poolConfig = userPoolConfig.methods.create(makeCall)
        makeCall(poolConfig.method, poolConfig.params, null, (err, poolResults) => {
          done(err, poolResults)
        })
      },

      // Create a user pool client
      (poolResults, done) => {
        const thunk = userPoolClientConfig.methods.create(makeCall)

        thunk(test, (err, poolClientConfig) => {
          makeCall(poolClientConfig.method, poolClientConfig.params, null, (err, poolClientResults) => {
            done(err, poolResults, poolClientResults)
          })
        })
      },
      
      // Sign up and get confirmation email
      (poolResults, poolClientResults, done) => {
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
          clearTimeout(emailTimeout)
          test.equal(true, true, 'should recieve confirmation email')
          done(err, poolResults, signUpResults, emailText, poolClientResults)
        })

        // Sign up a new user
        makeCall(['CognitoIdentityServiceProvider', 'signUp'], signUpParams, null, (err, results) => {
          test.equal(err, null, 'should sign up without error')
          signUpResults = results
        })

        // If we fail to recieve the email within 5 seconds, give up and fail
        let emailTimeout = setTimeout(() => {
          test.equal(true, false, 'should recieve confirmation email')
          done("Failed to recieve confirmation email")
        }, 5000)
      },

      // Confirm newly created user
      (poolResults, signUpResults, emailText, poolClientResults, done) => {
        const lines = emailText.trim().split('\n')
        const splitText = lines[lines.length - 1].split(' ')
        const confirmCode = splitText[splitText.length - 1]

        const confirmParams = {
          Username: 'testuser1234',
          ClientId: poolClientResults.UserPoolClient.ClientId,
          ConfirmationCode: confirmCode,
        }

        makeCall(['CognitoIdentityServiceProvider', 'confirmSignUp'], confirmParams, null, (err, confirmResults) => {
          test.equal(err, null, 'should confirm sign up without error')                
          done(null, poolResults, signUpResults, emailText, poolClientResults)
        })
      },

      // Sign in with our new user
      (poolResults, signUpResults, emailText, poolClientResults, done) => {
        const poolData = {
          ClientId: poolClientResults.UserPoolClient.ClientId,
          UserPoolId: poolResults.UserPool.Id,
          endpoint: endpoints['CognitoIdentityServiceProvider']
        }

        var userPool = new CognitoUserPool(poolData)

        const userData = {
          Pool: userPool,
          Username:'testuser1234',
        }

        const authDetails = new AuthenticationDetails({
          Username: 'testuser1234',
          Password: 'Amazingpass123.',
        })

        var cognitoUser = new CognitoUser(userData)

        const authenticationDetails = new AuthenticationDetails({
          Username: 'testuser1234',
          Password: 'Amazingpass123.',
        })

        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess: (results) => {
            test.equal(true, true, 'should authenticate successfully')
            done(null, results)
          },
          onFailure: (err) => {
            test.equal(true, false, 'should authenticate successfully')
            done(err)
          }
        })
      },

      // Fetch this user's attributes
      (authResults, done) => {
        const params = {
          AccessToken: authResults.accessToken.jwtToken
        }

        makeCall(['CognitoIdentityServiceProvider', 'getUser'], params, null, (err, results) => {
          test.equal(err, null, 'should get user data without error')
          test.equal(results.Username, 'testuser1234', 'should come back with sensible data')
          done(err, results)
        })
      }

    ], (err) => {
      test.equal(err, null, 'should complete flow without error')
      utils.cleanup(test, services)
    })
  })
})
