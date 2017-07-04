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

class CognitoIdentityServiceProvider extends BaseService {
  handlers() {
    return {
      "POST /": this.handleRequest.bind(this)
    }
  }

  setup(db, opts, callback) {
    this.port = opts.port || 14353
    super.setup.apply(this, arguments)
  }

  createUserPool(opts, req, res) {
    const transforms = {
      data: [function(data) {
        data.Name = data.PoolName
        delete data.PoolName
        return data
      }],
      resp: [function(data) {return {UserPool: data}}]
    }

    req.body.Id = `us-east-1_${uuid.v1()}`
    this.createItem(['CognitoIdentityServiceProvider', 'userPools', req.body.Id], req.body, res, transforms)
  }

  listUserPools(opts, req, res) {
    const path = ['CognitoIdentityServiceProvider', 'userPools']
    const respPath = ['UserPools']
    this.listItems(path, respPath, req, res)
  }

  updateUserPool(opts, req, res) {
    const transforms = {
      resp: [function(data) {return {UserPool: data}}]
    }

    const poolId = req.body.UserPoolId
    this.updateItem(['CognitoIdentityServiceProvider', 'userPools', poolId], req.body, req, res, transforms)
  }

  deleteUserPool(opts, req, res) {
    const poolId = req.body.UserPoolId
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]
    this.deleteItem(path, poolId, req, res)
  }

  describeUserPool(opts, req, res) {
    const transforms = {
      resp: [function(data) {
        return {UserPool: data}
      }]
    }

    const poolId = req.body.UserPoolId
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]
    this.getItem(path, req, res, transforms)
  }

  handleRequest(opts, req, res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    switch (action) {      
      case 'CreateUserPool': {
        _this.createUserPool(opts, req, res)
        break
      }

      case 'ListUserPools': {
        _this.listUserPools(opts, req, res)
        break
      }

      case 'UpdateUserPool': {
        _this.updateUserPool(opts, req, res)
        break
      }

      case 'DeleteUserPool': {
        _this.deleteUserPool(opts, req, res)
        break
      }

      case 'DescribeUserPool': {
        _this.describeUserPool(opts, req, res)
        break
      }

      default: {
        console.log("UNKNOWN ACTION", action)
        break
      }
    }
  }
}

module.exports = CognitoIdentityServiceProvider
