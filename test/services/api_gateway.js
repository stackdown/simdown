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


const deploymentTestOpts = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, id, context) => ({
      params: {
        restApiId: context.restApi,
        deploymentId: id
      },
      method: ['APIGateway', 'getDeployment']
    }),

    create: (makeCall, id) => ({
      method: ['APIGateway', 'createDeployment'],
      params: (test, callback) => {
        const callConfig = restAPITestOpts.methods.create(makeCall)

        makeCall(callConfig.method, callConfig.params, null, (err, apiResults) => {
          callback(err, {
            params: {
              restApiId: apiResults ? apiResults.id : undefined,
            },
            context: (results) => ({restApi: apiResults.id})
          })
        })
      }
    }),

    list: (makeCall, context) => ({
      params: {
        limit: 100,
        restApiId: context.restApi
      },
      method: ['APIGateway', 'getDeployments']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        restApiId: context.restApi,
        deploymentId: id
      },
      method: ['APIGateway', 'deleteDeployment']
    }),

    update: (makeCall, id, context) => ({
      params: {
        restApiId: context.restApi,
        deploymentId: id,
        patchOperations: [
          {
            op: 'replace',
            path: 'description',
            value: 'updated description text'
          }
        ]
      },
      method: ['APIGateway', 'updateDeployment']
    }),
    
  },
  listPath: 'items',
  updatePaths: [
    ['description']
  ],
  schema: {
    id: ['id'],
  },
  Services: [APIGatewayService],
  namespace: ['APIGateway', 'deployment']
})

// const stageTestOpts = utils.testCrud(test, {
//   only: 'create',
//   methods: {
//     get: (makeCall, id) => ({
//       params: {
//         restApiId: id
//       },
//       method: ['APIGateway', 'getStage']
//     }),
    
//     create: (makeCall, id) => ({
//       method: ['APIGateway', 'createStage'],
//       params: (test, callback) => {
//         const callConfig = restAPITestOpts.methods.create(makeCall)

//         makeCall(callConfig.method, callConfig.params, null, (err, apiResults) => {
//           callback(err, {
//             params: {
//               stageName: 'test-stage',
//               restApiId: apiResults ? apiResults.id : undefined,
//             },
//             context: (results) => ({pool: apiResults.id})
//           })
//         })
//       }
//     }),

//     list: (makeCall, context) => ({
//       params: {
//         limit: 100
//       },
//       method: ['APIGateway', 'getStages']
//     }),

//     remove: (makeCall, id, context) => ({
//       params: {
//         restApiId: id
//       },
//       method: ['APIGateway', 'deleteStage']
//     }),

//     update: (makeCall, id, context) => ({
//       params: {
//         restApiId: id,
//         patchOperations: [
//           {
//             op: 'replace',
//             path: 'name',
//             value: 'changed-name'
//           }
//         ]
//       },
//       method: ['APIGateway', 'updateStage']
//     }),
    
//   },
//   listPath: 'items',
//   updatePaths: [
//     ['name']
//   ],
//   schema: {
//     id: ['id'],
//   },
//   Services: [APIGatewayService],
//   namespace: ['APIGateway', 'stage']
// })