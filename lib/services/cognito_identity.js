const uuid = require('uuid')
const extend = require('extend')
const dbutil = require('../dbutil')
const BaseService = require('../base_service')

function reportErr(res, err) {
  res.status(400)
  res.header('x-amzn-errortype', 'ServiceError')
  res.json({
    message: err.message,
    code: 'ServiceError'
  })
}

function respond(err, data, res) {
  if (err) {
    reportErr(res, err)
  } else {
    if (data) {
      res.json(data)
    } else {
      res.end()
    }
  }
}

class CognitoIdentity extends BaseService {
  handlers() {
    return {
      "POST /": this.handleRequest.bind(this)
    }
  }

  setup(db, opts, callback) {
    this.port = opts.port || 14353
    super.setup.apply(this, arguments)
  }

  createIdentityPool(opts, req, res) {
    const idPath = ['IdentityPoolId']
    const poolId = `us-east-1:${uuid.v1()}`
    req.body.IdentityPoolId = poolId
    this.createItem(['IAM', 'identityPools', poolId], req.body, res)
  }

  listIdentityPools(opts, req, res) {
    const path = ['IAM', 'identityPools']
    const respPath = ['IdentityPools']
    this.listItems(path, respPath, req, res)
  }

  updateIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    this.updateItem(['IAM', 'identityPools', poolId], req.body, req, res)
  }

  deleteIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    const path = ['IAM', 'identityPools', poolId]
    this.deleteItem(path, poolId, req, res)
  }

  describeIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    const path = ['IAM', 'identityPools', poolId]
    this.getItem(path, req, res)
  }

  handleRequest(opts, req, res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    switch (action) {
      case 'CreateIdentityPool': {
        _this.createIdentityPool(opts, req, res)
        break
      }

      case 'UpdateIdentityPool': {
        _this.updateIdentityPool(opts, req, res)
        break
      }
      
      case 'ListIdentityPools': {
        _this.listIdentityPools(opts, req, res)
        break
      }

      case 'DescribeIdentityPool': {
        _this.describeIdentityPool(opts, req, res)
        break
      }

      case 'DeleteIdentityPool': {
        _this.deleteIdentityPool(opts, req, res)
        break
      }

      default: {
        console.log("UNKNOWN ACTION", action)
        break
      }
    }
  }
}

module.exports = CognitoIdentity
