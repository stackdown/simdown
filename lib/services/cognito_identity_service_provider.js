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
    req.body.Id = `us-east-1_${uuid.v1()}`
    req.body.Name = req.body.PoolName
    delete req.body.PoolName

    this.createItem(['CognitoIdentityServiceProvider', 'userPools', req.body.Id], req.body, (err, data) => {
      res.json({
        UserPool: data
      })
    })
  }

  listUserPools(opts, req, res) {
    const path = ['CognitoIdentityServiceProvider', 'userPools']
    const respPath = ['UserPools']
    this.listItems(path, respPath, req.body, (err, data) => {
      res.json(data)
    })
  }

  updateUserPool(opts, req, res) {
    const poolId = req.body.UserPoolId
    this.updateItem(['CognitoIdentityServiceProvider', 'userPools', poolId], req.body, (err, data) => {
      res.json({
        UserPool: data
      })
    })
  }

  deleteUserPool(opts, req, res) {
    const poolId = req.body.UserPoolId
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]
    this.deleteItem(path, poolId, (err, data) => {
      res.end()
    })
  }

  describeUserPool(opts, req, res) {
    const poolId = req.body.UserPoolId
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]
    this.getItem(path, (err, data) => {
      res.json({
        UserPool: data
      })
    })
  }

  createUserPoolClient(opts, req, res) {
    req.body.ClientId = `us-east-1_${uuid.v1()}`

    this.createItem(['CognitoIdentityServiceProvider', 'userPoolClients', req.body.ClientId], req.body, (err, data) => {
      res.json({
        UserPoolClient: data
      })
    })
  }

  listUserPoolClients(opts, req, res) {
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients']
    const respPath = ['UserPoolClients']
    this.listItems(path, respPath, req.body, (err, data) => {
      res.json(data)
    })
  }

  updateUserPoolClient(opts, req, res) {
    const poolId = req.body.ClientId
    this.updateItem(['CognitoIdentityServiceProvider', 'userPoolClients', poolId], req.body, (err, data) => {
      res.json({
        UserPoolClient: data
      })
    })
  }

  deleteUserPoolClient(opts, req, res) {
    const poolId = req.body.ClientId
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients', poolId]
    this.deleteItem(path, poolId, (err, data) => {
      res.end()
    })
  }

  describeUserPoolClient(opts, req, res) {
    const poolId = req.body.ClientId
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients', poolId]
    this.getItem(path, (err, data) => {
      res.json({
        UserPoolClient: data
      })
    })
  }

  handleRequest(opts, req, res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    const handlers = {
      ListUserPools: this.listUserPools,
      CreateUserPool: this.createUserPool,
      UpdateUserPool: this.updateUserPool,
      DeleteUserPool: this.deleteUserPool,
      DescribeUserPool: this.describeUserPool,
      
      ListUserPoolClients: this.listUserPoolClients,
      CreateUserPoolClient: this.createUserPoolClient,
      UpdateUserPoolClient: this.updateUserPoolClient,
      DeleteUserPoolClient: this.deleteUserPoolClient,
      DescribeUserPoolClient: this.describeUserPoolClient,
    }

    const handler = handlers[action]

    if (handler) {
      handler.call(this, opts, req, res)
    } else {
      console.log("UNKNOWN ACTION", action)
    }
  }
}

module.exports = CognitoIdentityServiceProvider
