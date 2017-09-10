const uuid = require('uuid')
const extend = require('extend')
const shortid = require('shortid')
const BaseService = require('../base_service')

function reportErr(res, err) {
  res.status(400)
  res.header('x-amzn-errortype', 'ServiceError')
  res.json({
    message: err.message,
    code: 'ServiceError'
  })
}

class APIGateway extends BaseService {
  handlers() {
    return {
      "GET /restapis": this.getHandler('GetRestApis'),
      "POST /restapis": this.getHandler('CreateRestApi'),
      "GET /restapis/:restApiId": this.getHandler('GetRestApi'),
      "PATCH /restapis/:restApiId": this.getHandler('UpdateRestApi'),
      "DELETE /restapis/:restApiId": this.getHandler('DeleteRestApi'),

      "GET /restapis/:restApiId/stages": this.getHandler('GetStages'),
      "POST /restapis/:restApiId/stages": this.getHandler('CreateStage'),
      "GET /restapis/:restApiId/stages/:stageName": this.getHandler('GetStage'),
      "PATCH /restapis/:restApiId/stages/:stageName": this.getHandler('UpdateStage'),
      "DELETE /restapis/:restApiId/stages/:stageName": this.getHandler('DeleteStage'),

      "GET /restapis/:restApiId/resources": this.getHandler('GetResources'),
      "POST /restapis/:restApiId/resources/:parentResource": this.getHandler('CreateResource'),
      "GET /restapis/:restApiId/resources/:resourceId": this.getHandler('GetResource'),
      "PATCH /restapis/:restApiId/resources/:resourceId": this.getHandler('UpdateResource'),
      "DELETE /restapis/:restApiId/resources/:resourceId": this.getHandler('DeleteResource'),

      "GET /restapis/:restApiId/deployments": this.getHandler('GetDeployments'),
      "POST /restapis/:restApiId/deployments": this.getHandler('CreateDeployment'),
      "GET /restapis/:restApiId/deployments/:deploymentId": this.getHandler('GetDeployment'),
      "PATCH /restapis/:restApiId/deployments/:deploymentId": this.getHandler('UpdateDeployment'),
      "DELETE /restapis/:restApiId/deployments/:deploymentId": this.getHandler('DeleteDeployment'),

      "PUT /restapis/:restApiId/resources/:resourceId/methods/:method": this.getHandler('PutMethod'),
      "GET /restapis/:restApiId/resources/:resourceId/methods/:method": this.getHandler('GetMethod'),
      "PATCH /restapis/:restApiId/resources/:resourceId/methods/:method": this.getHandler('UpdateMethod'),
      "DELETE /restapis/:restApiId/resources/:resourceId/methods/:method": this.getHandler('DeleteMethod'),

      "PUT /restapis/:restApiId/resources/:resourceId/methods/:method/integration": this.getHandler('PutIntegration'),
      "GET /restapis/:restApiId/resources/:resourceId/methods/:method/integration": this.getHandler('GetIntegration'),
      "PATCH /restapis/:restApiId/resources/:resourceId/methods/:method/integration": this.getHandler('UpdateIntegration'),
      "DELETE /restapis/:restApiId/resources/:resourceId/methods/:method/integration": this.getHandler('DeleteIntegration'),

      "GET /restapis/:restApiId/resources/:resourceId/methods/:method/responses/:statusCode": this.getHandler('GetMethodResponse'),
      "PUT /restapis/:restApiId/resources/:resourceId/methods/:method/responses/:statusCode": this.getHandler('PutMethodResponse'),
      "PATCH /restapis/:restApiId/resources/:resourceId/methods/:method/responses/:statusCode": this.getHandler('UpdateMethodResponse'),
      "DELETE /restapis/:restApiId/resources/:resourceId/methods/:method/responses/:statusCode": this.getHandler('DeleteMethodResponse'),

      "PUT /restapis/:restApiId/resources/:resourceId/methods/:method/integration/responses/:statusCode": this.getHandler('PutIntegrationResponse'),
      "GET /restapis/:restApiId/resources/:resourceId/methods/:method/integration/responses/:statusCode": this.getHandler('GetIntegrationResponse'),
      "PATCH /restapis/:restApiId/resources/:resourceId/methods/:method/integration/responses/:statusCode": this.getHandler('UpdateIntegrationResponse'),
      "DELETE /restapis/:restApiId/resources/:resourceId/methods/:method/integration/responses/:statusCode": this.getHandler('DeleteIntegrationResponse'),
    }
  }

  setup(db, opts, callback) {
    this.port = opts.port || 31248
    this.disableParsing = true
    super.setup.apply(this, arguments)
  }

  updateFromPatchOpts(patchOps) {
    let update = {}

    for (let patchOp of patchOps) {
      const path = patchOp.path.split('/')

      switch (patchOp.op) {
        case 'add': {
          this.setDeepVal(update, path, patchOp.value)
          break
        }

        case 'replace': {
          this.setDeepVal(update, path, patchOp.value)
          break
        }

        case 'remove': {
          this.setDeepVal(update, path)
          break
        }
      }
    }

    return update
  }

  createRestApi(opts, data, callback) {
    const id = uuid.v1()
    const resourceId = shortid.generate()
    
    data.id = id

    const rootResource = {
      id: resourceId,
      path: '/'
    }

    this.createItem(['APIGateway', 'restApis', id], data, (err, results) => {
      this.createItem(['APIGateway', 'resources', id, resourceId], rootResource, (err, resourceResults) => {
        callback(err, results)
      })
    })
  }

  listRestApis(opts, data, callback) {
    const path = ['APIGateway', 'restApis']
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        item: data,
        position: config.position
      })
    })
  }

  updateRestApi(opts, data, callback) {
    const id = data.restApiId
    delete data.restApiId

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.updateItem(['APIGateway', 'restApis', id], update, callback)
  }

  deleteRestApi(opts, data, callback) {
    const id = data.restApiId
    const path = ['APIGateway', 'restApis', id]
    this.deleteItem(path, id, (err, data) => {
      callback(err)
    })
  }

  getRestApi(opts, data, callback) {
    const id = data.restApiId
    const path = ['APIGateway', 'restApis', id]
    this.getItem(path, callback)
  }

  createDeployment(opts, data, callback) {
    const restApi = data.restApiId
    const id = `${uuid.v1()}`
    data.id = id
    this.createItem(['APIGateway', 'deployments', restApi, id], data, callback)
  }

  listDeployments(opts, data, callback) {
    const path = ['APIGateway', 'deployments']
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        item: data,
        position: config.position
      })
    })
  }

  updateDeployment(opts, data, callback) {
    const restApi = data.restApiId
    const deployment = data.deploymentId
    delete data.restApiId
    delete data.deploymentId

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.updateItem(['APIGateway', 'deployments', restApi, deployment], update, callback)
  }

  deleteDeployment(opts, data, callback) {
    const id = data.deploymentId
    const restApi = data.restApiId

    const path = ['APIGateway', 'deployments', restApi, id]
    this.deleteItem(path, id, (err, data) => {
      callback(err)
    })
  }

  getDeployment(opts, data, callback) {
    const id = data.deploymentId
    const restApi = data.restApiId
    const path = ['APIGateway', 'deployments', restApi, id]
    this.getItem(path, callback)
  }

  createStage(opts, data, callback) {
    const {stageName, restApiId} = data
    delete data.restApiId
    delete data.deploymentId

    this.createItem(['APIGateway', 'stages', restApiId, stageName], data, callback)
  }

  listStages(opts, data, callback) {
    const path = ['APIGateway', 'stages', data.restApiId]
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        item: data,
        position: config.position
      })
    })
  }

  updateStage(opts, data, callback) {
    const restApi = data.restApiId
    const stageName = data.stageName

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.updateItem(['APIGateway', 'stages', restApi, stageName], update, callback)
  }

  deleteStage(opts, data, callback) {
    const restApi = data.restApiId
    const stageName = data.stageName

    const path = ['APIGateway', 'stages', restApi, stageName]
    this.deleteItem(path, stageName, (err, data) => {
      callback(err)
    })
  }

  getStage(opts, data, callback) {
    const stageName = data.stageName
    const restApi = data.restApiId
    const path = ['APIGateway', 'stages', restApi, stageName]
    this.getItem(path, callback)
  }

  createResource(opts, data, callback) {
    data.id = shortid.generate()    
    const {parentResource, restApiId} = data
    delete data.restApiId
    delete data.parentResource

    this.createItem(['APIGateway', 'resources', restApiId, data.id], data, callback)
  }

  listResources(opts, data, callback) {
    const path = ['APIGateway', 'resources', data.restApiId]
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        item: data,
        position: config.position
      })
    })
  }

  updateResource(opts, data, callback) {
    const restApiId = data.restApiId
    const resourceId = data.resourceId

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.updateItem(['APIGateway', 'resources', restApiId, resourceId], update, callback)
  }

  deleteResource(opts, data, callback) {
    const restApiId = data.restApiId
    const resourceId = data.resourceId

    const path = ['APIGateway', 'resources', restApiId, resourceId]
    this.deleteItem(path, resourceId, (err, data) => {
      callback(err)
    })
  }

  getResource(opts, data, callback) {
    const restApiId = data.restApiId
    const resourceId = data.resourceId
    const path = ['APIGateway', 'resources', restApiId, resourceId]
    this.getItem(path, callback)
  }

  createMethod(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource.resourceMethods === undefined) {
        resource.resourceMethods = {}
      }

      data.httpMethod = data.method
      delete data.method

      resource.resourceMethods[method] = data

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, data)
      })
    })
  }

  updateMethod(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource.resourceMethods === undefined) {
        resource.resourceMethods = {}
      }

      resource.resourceMethods[method] = extend(true, data, update)

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  deleteMethod(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && resource.resourceMethods) {
        delete resource.resourceMethods[method]
      }

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  getMethod(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && resource.resourceMethods && resource.resourceMethods[method]) {
        callback(null, resource.resourceMethods[method])
      } else {
        callback('Method Not Found')
      }
    })
  }

  createIntegration(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      delete data.method

      let methodData = resource.resourceMethods[method]

      methodData.methodIntegration = data

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, data)
      })
    })
  }

  updateIntegration(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      let methodData = resource.resourceMethods[method]

      methodData.methodIntegration = extend(true, methodData.methodIntegration, update)

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  deleteIntegration(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && resource.resourceMethods && resource.resourceMethods[method]) {
        delete resource.resourceMethods[method].methodIntegration
      }

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  getIntegration(opts, data, callback) {
    const {resourceId, restApiId, method} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && resource.resourceMethods && resource.resourceMethods[method]) {
        callback(null, resource.resourceMethods[method].methodIntegration)
      } else {
        callback('Method Not Found')
      }
    })
  }

  createMethodResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      delete data.method

      let methodData = resource.resourceMethods[method]

      if (methodData.methodResponses === undefined) {
        methodData.methodResponses = {}
      }

      methodData.methodResponses[statusCode] = data

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, data)
      })
    })
  }

  updateMethodResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      let methodData = resource.resourceMethods[method]

      methodData.methodResponses[statusCode] = extend(true, methodData.methodResponses[statusCode], update)

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  deleteMethodResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && 
          resource.resourceMethods && 
          resource.resourceMethods[method] && 
          resource.resourceMethods[method].methodResponses[statusCode]) {
        delete resource.resourceMethods[method].methodResponses[statusCode]
      }

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  getMethodResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && resource.resourceMethods && resource.resourceMethods[method]) {
        callback(null, resource.resourceMethods[method].methodResponses[statusCode])
      } else {
        callback('Method Not Found')
      }
    })
  }

  createIntegrationResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      let integrationData = resource.resourceMethods[method].methodIntegration

      if (integrationData.integrationResponses === undefined) {
        integrationData.integrationResponses = {}
      }

      delete data.method
      integrationData.integrationResponses[statusCode] = data

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, data)
      })
    })
  }

  updateIntegrationResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      let integrationData = resource.resourceMethods[method].methodIntegration

      if (integrationData.integrationResponses === undefined) {
        integrationData.integrationResponses = {}
      }

      integrationData.integrationResponses[statusCode] = extend(true, integrationData.integrationResponses[statusCode], update)

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  deleteIntegrationResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && 
          resource.resourceMethods && 
          resource.resourceMethods[method] && 
          resource.resourceMethods[method].methodIntegration && 
          resource.resourceMethods[method].methodIntegration.integrationResponses && 
          resource.resourceMethods[method].methodIntegration.integrationResponses[statusCode]) {
        delete resource.resourceMethods[method].methodIntegration.integrationResponses[statusCode]
      } else {
        callback('Method Not Found')
      }

      this.updateItem(['APIGateway', 'resources', restApiId, resourceId], resource, (err, results) => {
        callback(err, resource)
      })
    })
  }

  getIntegrationResponse(opts, data, callback) {
    const {resourceId, restApiId, method, statusCode} = data

    this.getItem(['APIGateway', 'resources', restApiId, resourceId], (err, resource) => {
      if (err) {return callback(err)}

      if (resource && resource.resourceMethods && resource.resourceMethods[method]) {
        callback(null, resource.resourceMethods[method].methodIntegration.integrationResponses[statusCode])
      } else {
        callback('Method Not Found')
      }
    })
  }

  getHandler(method) {
    return (opts, req, res) => {
      let allData = ''
      req.on('data', (data) => {
        allData += data.toString()
      })

      req.on('error', (err) => {
        console.log("REQUEST ERROR", err)
      })

      req.on('end', () => {
        let bodyData = {}
        try {
          bodyData = JSON.parse(allData)
        } catch(e) {
          bodyData = {}
        }

        const data = extend(true, bodyData, req.params)

        const handlers = {
          GetRestApi: this.getRestApi,
          GetRestApis: this.listRestApis,
          CreateRestApi: this.createRestApi,
          UpdateRestApi: this.updateRestApi,
          DeleteRestApi: this.deleteRestApi,

          GetDeployment: this.getDeployment,
          GetDeployments: this.listDeployments,
          CreateDeployment: this.createDeployment,
          UpdateDeployment: this.updateDeployment,
          DeleteDeployment: this.deleteDeployment,

          GetStage: this.getStage,
          GetStages: this.listStages,
          CreateStage: this.createStage,
          UpdateStage: this.updateStage,
          DeleteStage: this.deleteStage,

          GetResource: this.getResource,
          GetResources: this.listResources,
          CreateResource: this.createResource,
          UpdateResource: this.updateResource,
          DeleteResource: this.deleteResource,

          GetMethod: this.getMethod,
          PutMethod: this.createMethod,
          UpdateMethod: this.updateMethod,
          DeleteMethod: this.deleteMethod,

          GetIntegration: this.getIntegration,
          PutIntegration: this.createIntegration,
          UpdateIntegration: this.updateIntegration,
          DeleteIntegration: this.deleteIntegration,

          GetMethodResponse: this.getMethodResponse,
          PutMethodResponse: this.createMethodResponse,
          UpdateMethodResponse: this.updateMethodResponse,
          DeleteMethodResponse: this.deleteMethodResponse,

          GetIntegrationResponse: this.getIntegrationResponse,
          PutIntegrationResponse: this.createIntegrationResponse,
          UpdateIntegrationResponse: this.updateIntegrationResponse,
          DeleteIntegrationResponse: this.deleteIntegrationResponse,
        }

        const handler = handlers[method]

        if (handler) {
          this.reportCall(['APIGateway', method, 'before'], {data: data}, () => {
            handler.call(this, opts, data, (err, results) => {
              this.reportCall(['APIGateway', method, 'after'], {data: data, err, results}, () => {
                if (err) {
                  reportErr(res, err)
                } else {
                  res.json(results)
                }
              })
            })
          })
        } else {
          console.log("UNKNOWN METHOD", method)
        }
      })
    }
  }

}

module.exports = APIGateway
