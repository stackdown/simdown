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
    this.createItem(['CognitoIdentity', 'identityPools', poolId], req.body, function(err, data) {
      res.json(data)
    })
  }

  listIdentityPools(opts, req, res) {
    const path = ['CognitoIdentity', 'identityPools']
    const respPath = ['IdentityPools']
    this.listItems(path, respPath, req.body, function(err, data) {
      res.json(data)
    })
  }

  updateIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    this.updateItem(['CognitoIdentity', 'identityPools', poolId], req.body, function(err, data) {
      res.json(data)
    })
  }

  deleteIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    const path = ['CognitoIdentity', 'identityPools', poolId]
    this.deleteItem(path, poolId, function(err, data) {
      res.end()
    })
  }

  describeIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    const path = ['CognitoIdentity', 'identityPools', poolId]
    this.getItem(path, function(err, data) {
      res.json(data)
    })
  }

  handleRequest(opts, req, res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    const handlers = {
      ListIdentityPools: this.listIdentityPools,
      CreateIdentityPool: this.createIdentityPool,
      UpdateIdentityPool: this.updateIdentityPool,
      DeleteIdentityPool: this.deleteIdentityPool,
      DescribeIdentityPool: this.describeIdentityPool,
      
    }

    const handler = handlers[action]

    if (handler) {
      handler.call(this, opts, req, res)
    } else {
      console.log("UNKNOWN ACTION", action)
    }
  }
}

module.exports = CognitoIdentity
