const uuid = require('uuid')
const extend = require('extend')
const dbutil = require('../dbutil')
const datamask = require('datamask')
const emailutil = require('../emailutil')
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
    this.port = opts.port || 14357
    super.setup.apply(this, arguments)
  }

  createUserPool(opts, data, callback) {
    data.Id = `us-east-1_${uuid.v1()}`
    data.Name = data.PoolName
    delete data.PoolName

    this.createItem(['CognitoIdentityServiceProvider', 'userPools', data.Id], data, (err, data) => {
      callback(err, {
        UserPool: data
      })
    })
  }

  listUserPools(opts, data, callback) {
    const path = ['CognitoIdentityServiceProvider', 'userPools']
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        UserPools: data,
        NextToken: config.NextToken
      })
    })
  }

  updateUserPool(opts, data, callback) {
    const poolId = data.UserPoolId
    this.updateItem(['CognitoIdentityServiceProvider', 'userPools', poolId], data, (err, data) => {
      callback(err, {
        UserPool: data
      })
    })
  }

  deleteUserPool(opts, data, callback) {
    const poolId = data.UserPoolId
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]
    this.deleteItem(path, poolId, (err, data) => {
      callback(err)
    })
  }

  describeUserPool(opts, data, callback) {
    const poolId = data.UserPoolId
    const path = ['CognitoIdentityServiceProvider', 'userPools', poolId]
    this.getItem(path, (err, data) => {
      callback(err, {
        UserPool: data
      })
    })
  }

  createUserPoolClient(opts, data, callback) {
    data.ClientId = `${uuid.v1().split('-').join('')}`

    this.createItem(['CognitoIdentityServiceProvider', 'userPoolClients', data.ClientId], data, (err, data) => {
      callback(err, {
        UserPoolClient: data
      })
    })
  }

  listUserPoolClients(opts, data, callback) {
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients']
    this.listItems(path, data, (err, data, config) => {
      callback(err, {
        NextToken: config.NextToken,
        UserPoolClients: data
      })
    })
  }

  updateUserPoolClient(opts, data, callback) {
    const poolId = data.ClientId
    this.updateItem(['CognitoIdentityServiceProvider', 'userPoolClients', poolId], data, (err, data) => {
      callback(err, {
        UserPoolClient: data
      })
    })
  }

  deleteUserPoolClient(opts, data, callback) {
    const poolId = data.ClientId
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients', poolId]
    this.deleteItem(path, poolId, (err, data) => {
      callback()
    })
  }

  describeUserPoolClient(opts, data, callback) {
    const poolId = data.ClientId
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients', poolId]
    this.getItem(path, (err, data) => {
      callback(err, {
        UserPoolClient: data
      })
    })
  }

  confirmSignUp(opts, data, callback) {
    callback()
  }

  signUp(opts, data, callback) {
    data.UserSub = `${uuid.v1()}`

    let email = undefined
    for (var attr of data.UserAttributes || []) {
      if (attr.Name === 'email') {
        email = attr.Value
      }
    }

    this.createItem(['CognitoIdentityServiceProvider', 'users', data.Username], data, (err, data) => {
      emailutil.sendEmail("Your confirmation code is 123456", (err, results) => {
        callback(err, {
          CodeDeliveryDetails: {
            AttributeName: 'email',
            DeliveryMedium: 'EMAIL',
            Destination: datamask.email(email)
          },
          UserConfirmed: false,
          UserSub: data.UserSub
        })
      })
    })
  }

  initiateAuth(opts, data, callback) {
    const username = data.AuthParameters.USERNAME
    const secretBlock = uuid.v1()
    this.createItem(['CognitoIdentityServiceProvider', 'authChallenges', secretBlock], data, (err, results) => {
      callback(err, {
        ChallengeName: "PASSWORD_VERIFIER",
        ChallengeParameters: {
          SALT: `${uuid.v1().split('-').join('')}`,
          SECRET_BLOCK: secretBlock,
          SRP_B: "moresecretdata",
          USERNAME: username,
          USER_ID_FOR_SRP: username
        }
      })
    })
  }

  respondToAuthChallenge(opts, data, callback) {
    const path = ['CognitoIdentityServiceProvider', 'authChallenges', data.ChallengeResponses.PASSWORD_CLAIM_SECRET_BLOCK]

    this.getItem(path, (err, itemData) => {
      if (itemData) {
        const username = data.ChallengeResponses.USERNAME
        const accessToken = uuid.v1()
        const tokenPath = ['CognitoIdentityServiceProvider', 'accessTokens', username]

        const tokenData = {
          username,
          accessToken
        }

        this.createItem(tokenPath, tokenData, (err, results) => {
          callback(err, {
            ChallengeParameters: {},
            AuthenticationResult: {
              AccessToken: accessToken,
              ExpiresIn: 3600,
              IdToken: 'idtoken',
              RefreshToken: 'refreshtoken',
              TokenType: "Bearer"
            }
          })
        })
      } else {
        callback("Simdown: No known challenge with corresponding password secret")
      }
    })
  }

  getUser(opts, data, callback) {
    const path = ['CognitoIdentityServiceProvider', 'accessTokens']
    this.listItems(path, data, (err, item, config) => {
      let username = undefined
      for (var user of item) {
        if (user.accessToken === data.AccessToken) {
          username = user.username
        }
      }

      const userPath = ['CognitoIdentityServiceProvider', 'users', username]
      this.getItem(userPath, callback)
    })
  }

  handleRequest(opts, req,  res) {
    let _this = this
    const target = req.headers['x-amz-target']
    
    const service = target.split('.')[0]
    const action = target.split('.')[1]

    const handlers = {
      SignUp: this.signUp,
      GetUser: this.getUser,
      DeleteUser: this.deleteUser,
      InitiateAuth: this.initiateAuth,
      ConfirmSignUp: this.confirmSignUp,
      RespondToAuthChallenge: this.respondToAuthChallenge,

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
      this.reportCall(['CognitoIdentityServiceProvider', action, 'before'], {data: req.body}, () => {
        handler.call(this, opts, req.body, (err, results) => {
          this.reportCall(['CognitoIdentityServiceProvider', action, 'after'], {data: req.body, err, results}, () => {
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

module.exports = CognitoIdentityServiceProvider
