const uuid = require('uuid')
const extend = require('extend')
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

      "GET /restapis/:restApiId/deployments": this.getHandler('GetDeployments'),
      "POST /restapis/:restApiId/deployments": this.getHandler('CreateDeployment'),
      "GET /restapis/:restApiId/deployments/:deploymentId": this.getHandler('GetDeployment'),
      "PATCH /restapis/:restApiId/deployments/:deploymentId": this.getHandler('UpdateDeployment'),
      "DELETE /restapis/:restApiId/deployments/:deploymentId": this.getHandler('DeleteDeployment'),

      "PUT /restapis/:restApiId/resources/:parentResource/methods/:method": this.getHandler('PutMethod'),
      "GET /restapis/:restApiId/resources/:parentResource/methods/:method": this.getHandler('GetMethod'),
      "PUT /restapis/:restApiId/resources/:parentResource/methods/:method/integration": this.getHandler('PutMethodIntegration'),
      "GET /restapis/:restApiId/resources/:parentResource/methods/:method/responses/:statusCode": this.getHandler('GetMethodResponse'),
      "PUT /restapis/:restApiId/resources/:parentResource/methods/:method/responses/:statusCode": this.getHandler('PutMethodResponse'),
      "PUT /restapis/:restApiId/resources/:parentResource/methods/:method/integration/responses/:statusCode": this.getHandler('PutIntegrationResponse'),
    }
  }

  setup(db, opts, callback) {
    this.port = opts.port || 31248
    super.setup.apply(this, arguments)
  }

  setDeepVal(obj, path, val) {
    for (let index in path) {
      let current = obj
      let subPath = path[index]
      if (index == path.length - 1) {
        current[subPath] = val
      } else {
        current = current[subPath] || {}
      }
    }
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
    const id = `${uuid.v1()}`
    data.id = id
    this.createItem(['APIGateway', 'restApis', id], data, callback)
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

  getHandler(method) {
    return (opts, req, res) => {
      let allData = ''
      req.on('data', (data) => {
        allData += data.toString()
      })

      req.on('end', () => {
        let bodyData = {}
        try {
          bodyData = JSON.parse(allData)
        } catch(e) {

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
