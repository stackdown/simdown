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

  createIdentityPool(opts, data, callback) {
    const idPath = ['IdentityPoolId']
    const poolId = `us-east-1:${uuid.v1()}`
    data.IdentityPoolId = poolId
    this.createItem(['CognitoIdentity', 'identityPools', poolId], data, callback)
  }

  listIdentityPools(opts, data, callback) {
    const path = ['CognitoIdentity', 'identityPools']
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        IdentityPools: data,
        NextToken: config.NextToken
      })
    })
  }

  updateIdentityPool(opts, data, callback) {
    const poolId = data.IdentityPoolId
    this.updateItem(['CognitoIdentity', 'identityPools', poolId], data, callback)
  }

  deleteIdentityPool(opts, data, callback) {
    const poolId = data.IdentityPoolId
    const path = ['CognitoIdentity', 'identityPools', poolId]
    this.deleteItem(path, poolId, (err, data) => {
      callback(err)
    })
  }

  describeIdentityPool(opts, data, callback) {
    const poolId = data.IdentityPoolId
    const path = ['CognitoIdentity', 'identityPools', poolId]
    this.getItem(path, callback)
  }

  handleRequest(opts, req, res) {
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
      this.reportCall(['CognitoIdentity', action, 'before'], {data: req.body}, () => {
        handler.call(this, opts, req.body, (err, results) => {
          this.reportCall(['CognitoIdentity', action, 'after'], {data: req.body, err, results}, () => {
            if (err) {
              reportErr(res, err)
            } else {
              res.json(results)
            }
          })
        })
      })
    } else {
      console.log("UNKNOWN ACTION", action)
    }
  }
}

module.exports = CognitoIdentity
