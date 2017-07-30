const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('../utils')
const APIGatewayService = require('../../lib/services/api_gateway')

const restAPITestOpts = utils.testCrud(test, {
  // only: 'update',
  methods: {
    get: (makeCall, id) => ({
      params: {
        restApiId: id
      },
      method: ['APIGateway', 'getRestApi']
    }),
    
    create: (makeCall, id) => ({
      params: {
        name: 'test-api'
      },
      method: ['APIGateway', 'createRestApi']
    }),

    list: (makeCall, context) => ({
      params: {
        limit: 100
      },
      method: ['APIGateway', 'getRestApis']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        restApiId: id
      },
      method: ['APIGateway', 'deleteRestApi']
    }),

    update: (makeCall, id, context) => ({
      params: {
        restApiId: id,
        patchOperations: [
          {
            op: 'replace',
            path: 'name',
            value: 'changed-name'
          }
        ]
      },
      method: ['APIGateway', 'updateRestApi']
    }),
    
  },
  listPath: 'items',
  updatePaths: [
    ['name']
  ],
  schema: {
    id: ['id'],
  },
  Services: [APIGatewayService],
  namespace: ['APIGateway', 'restApi']
})