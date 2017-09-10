const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const IamService = require('../../lib/services/iam')
const LambdaService = require('../../lib/services/lambda')

const functionsOpts = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, id) => ({
      params: {
        FunctionName: 'test-function'
      },
      method: ['Lambda', 'getFunction']
    }),
    
    create: (makeCall, id) => ({
      method: ['Lambda', 'createFunction'],
      params: (test, callback) => {
        const params = {
          RoleName: 'test-role',
          Description: 'original description',
          AssumeRolePolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: {
                Service: ['ec2.amazonaws.com']
              },
              Action: ['sts:AssumeRole']
            }]
          })
        }

        makeCall(['IAM', 'createRole'], params, null, (err, results) => {
          callback(err, {
            params: {
              Code: {},
              Role: results.Role.Arn,
              Handler: 'test.handler',
              Runtime: 'nodejs6.10',
              FunctionName: 'test-function',
            },
            context: (results) => ({
              // restApiId: apiResults.id,
              // resourceId: rootResource
            })
          })
        })
      }
    }),

    list: (makeCall, context) => ({
      params: {
        MaxItems: 100
      },
      method: ['Lambda', 'listFunctions']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        FunctionName: 'test-function'
      },
      method: ['Lambda', 'deleteFunction']
    }),

    update: (makeCall, id, context) => ({
      params: {
        FunctionName: 'test-function',
        Runtime: 'python3.6'
      },
      method: ['Lambda', 'updateFunction']
    }),
    
  },
  listPath: 'Functions',
  updatePaths: [
    ['Runtime']
  ],
  schema: (testType) => {
    if (testType === 'create' || testType === 'list') {
      return {id: ['FunctionName']}
    } else {
      return {id: ['Configuration', 'FunctionName']}
    }
  },
  Services: [LambdaService, IamService],
  namespace: ['Lambda', 'function']
})