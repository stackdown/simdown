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
  // only: 'create',
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

const stageTestOpts = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, name, context) => ({
      params: {
        stageName: name,
        restApiId: context.restApi,
      },
      method: ['APIGateway', 'getStage']
    }),
    
    create: (makeCall) => ({
      method: ['APIGateway', 'createStage'],
      params: (test, callback) => {
        const createApi = restAPITestOpts.methods.create(makeCall)
        const createDeployment = deploymentTestOpts.methods.create(makeCall)

        utils.getFinalParams(test, createDeployment, (err, deployParams) => {
          makeCall(createApi.method, createApi.params, null, (err, apiResults) => {
            makeCall(deployParams.method, deployParams.params, null, (err, deploymentResults) => {
              callback(err, {
                params: {
                  stageName: 'test-stage',
                  restApiId: apiResults ? apiResults.id : undefined,
                  description: 'original description',
                  deploymentId: deploymentResults ? deploymentResults.id : undefined,
                },
                context: (results) => ({
                  restApi: apiResults.id,
                  deployment: deploymentResults.id
                })
              })
            })
          })
        })
      }
    }),

    list: (makeCall, context) => ({
      params: {
        restApiId: context.restApi,
        deploymentId: context.deployment
      },
      method: ['APIGateway', 'getStages']
    }),

    remove: (makeCall, name, context) => ({
      params: {
        stageName: name,
        restApiId: context.restApi
      },
      method: ['APIGateway', 'deleteStage']
    }),

    update: (makeCall, name, context) => ({
      params: {
        restApiId: context.restApi,
        stageName: name,
        patchOperations: [
          {
            op: 'replace',
            path: 'description',
            value: 'new description text'
          }
        ]
      },
      method: ['APIGateway', 'updateStage']
    }),

  },
  listPath: 'item',
  updatePaths: [
    ['description']
  ],
  schema: {
    id: ['stageName'],
  },
  Services: [APIGatewayService],
  namespace: ['APIGateway', 'stage']
})

const resourceTestOpts = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, id, context) => ({
      params: {
        restApiId: context.restApi,
        resourceId: id
      },
      method: ['APIGateway', 'getResource']
    }),

    create: (makeCall, id) => ({
      method: ['APIGateway', 'createResource'],
      params: (test, callback) => {
        const callConfig = restAPITestOpts.methods.create(makeCall)

        // Create a restApi (should automatically create a root resource)
        makeCall(callConfig.method, callConfig.params, null, (err, apiResults) => {
          const getResourcesParams = {
            restApiId: apiResults ? apiResults.id : undefined
          }

          // Fetch the api's resources to get the ID of the root
          makeCall(['APIGateway', 'getResources'], getResourcesParams, null, (err, resourceResults) => {

            if (!apiResults || resourceResults.items.length === 0) {
              test.equal(true, false, 'should automatically creat a root resource with rest APIs')
            } else { 
              test.equal(true, true, 'should automatically creat a root resource with rest APIs')
            }

            const rootResource = resourceResults.items[0].id

            callback(err, {
              params: {
                pathPart: 'testpath',
                parentId: rootResource,
                restApiId: apiResults ? apiResults.id : undefined
              },
              context: (results) => ({restApi: apiResults.id})
            })
          })
        })
      }
    }),

    list: (makeCall, context) => ({
      params: {
        limit: 100,
        restApiId: context.restApi
      },
      method: ['APIGateway', 'getResources']
    }),

    remove: (makeCall, id, context) => ({
      params: {
        restApiId: context.restApi,
        resourceId: id
      },
      method: ['APIGateway', 'deleteResource']
    }),

    update: (makeCall, id, context) => ({
      params: {
        restApiId: context.restApi,
        resourceId: id,
        patchOperations: [
          {
            op: 'replace',
            path: 'resourceMethods/ANY',
            value: '{}'
          }
        ]
      },
      method: ['APIGateway', 'updateResource']
    }),
    
  },
  listPath: 'items',
  updatePaths: [
    ['resourceMethods', 'ANY']
  ],
  schema: {
    id: ['id'],
  },
  baseCount: 1,
  Services: [APIGatewayService],
  namespace: ['APIGateway', 'resource']
})