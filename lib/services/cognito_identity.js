const uuid = require('uuid')
const dbutil = require('../dbutil')
const queryString = require('query-string')
const BaseService = require('../base_service')

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
    const poolId = `us-east-1:${uuid.v1()}`    
    const path = ['IAM', 'identityPools', poolId]
    
    let pool = req.body
    pool.IdentityPoolId = poolId

    dbutil.put(this.db, path, pool, function(err) {
      res.json(pool)
    })
  }

  handleRequest(opts, req, res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    switch (action) {
      case 'CreateIdentityPool':
        _this.createIdentityPool(opts, req, res)
        break
      default:
        console.log("UNKNOWN ACTION", target)
        break
    }
  }
}

module.exports = CognitoIdentity
