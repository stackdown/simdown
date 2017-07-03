const uuid = require('uuid')
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

  listIdentityPools(opts, req, res) {
    const poolId = `us-east-1:${uuid.v1()}`    
    const path = ['IAM', 'identityPools']
    let listOpts = undefined

    if (req.body.NextToken) {
      listOpts = JSON.parse(req.body.NextToken)
    } else {
      listOpts = {
        limit: 1000,
        offset: 0
      }
    }

    dbutil.list(this.db, path, listOpts, function(err, results) {
      if (err) {
        reportErr(res, err)
      } else {
        let resp = {
          IdentityPools: results
        }

        if (results.length >= listOpts.limit) {
          listOpts.offset += listOpts.limit
        } 

        res.json(resp)
      }
    })
  }

  createIdentityPool(opts, req, res) {
    const poolId = `us-east-1:${uuid.v1()}`    
    const path = ['IAM', 'identityPools', poolId]
    
    let pool = req.body
    pool.IdentityPoolId = poolId

    this.log('Create pool', pool)
    dbutil.put(this.db, path, pool, function(err) {
      if (err) {
        reportErr(res, err)
      } else {
        res.json(pool)
      }
    })
  }

  deleteIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    const path = ['IAM', 'identityPools', poolId]

    this.log('Delete pool', poolId)
    dbutil.del(this.db, path, function(err) {
      if (err) {
        reportErr(res, err)
      } else {
        res.end()
      }
    })
  }

  describeIdentityPool(opts, req, res) {
    const poolId = req.body.IdentityPoolId
    const path = ['IAM', 'identityPools', poolId]

    dbutil.get(this.db, path, function(err, results) {
      if (err) {
        reportErr(res, err)
      } else {
        res.send(results)
      }
    })
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
