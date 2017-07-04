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
    const poolId = `us-east-1_${uuid.v1()}`
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]

    let pool = req.body
    pool.Id = poolId
    pool.Name = pool.PoolName
    delete pool.PoolName

    this.log('Create user pool', poolId)
    dbutil.put(this.db, path, pool, function(err) {
      if (err) {
        reportErr(res, err)
      } else {
        res.json({
          UserPool: pool
        })
      }
    })
  }

  newUserPoolTransform(data) {
    data.Name = data.PoolName
    delete data.PoolName
    return data
  }

  handleRequest(opts, req, res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    switch (action) {      
      case 'CreateUserPool': {
        const transforms = {
          data: [_this.newUserPoolTransform],
          resp: [function(data) {return {UserPool: data}}]
        }

        req.body.Id = `us-east-1_${uuid.v1()}`
        _this.createItem(['CognitoIdentityServiceProvider', 'userPools'], req.body, res, transforms)
        // _this.createUserPool(opts, req, res)
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
