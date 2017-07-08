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
    this.listItems(path, req.body, (err, data, config) => {
      res.json({
        UserPools: data,
        NextToken: config.NextToken
      })
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
    req.body.ClientId = `${uuid.v1().split('-').join('')}`

    this.createItem(['CognitoIdentityServiceProvider', 'userPoolClients', req.body.ClientId], req.body, (err, data) => {
      res.json({
        UserPoolClient: data
      })
    })
  }

  listUserPoolClients(opts, req, res) {
    const path = ['CognitoIdentityServiceProvider', 'userPoolClients']
    this.listItems(path, req.body, (err, data, config) => {
      res.json({
        NextToken: config.NextToken,
        UserPoolClients: data
      })
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

  confirmSignUp(opts, req, res) {
    res.end()
  }

  signUp(opts, req, res) {
    const data = req.body
    data.UserSub = `${uuid.v1()}`

    let email = undefined
    for (var attr of data.UserAttributes || []) {
      if (attr.Name === 'email') {
        email = attr.Value
      }
    }

    this.createItem(['CognitoIdentityServiceProvider', 'users', data.Username], data, (err, data) => {
      emailutil.sendEmail("Your confirmation code is 123456", (err, results) => {
        res.json({
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

  initiateAuth(opts, req, res) {
    const data = req.body
    const username = data.AuthParameters.USERNAME
    const secretBlock = uuid.v1()
    this.createItem(['CognitoIdentityServiceProvider', 'authChallenges', secretBlock], data, (err, results) => {
      res.json({
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

  respondToAuthChallenge(opts, req, res) {
    const path = ['CognitoIdentityServiceProvider', 'authChallenges', req.body.ChallengeResponses.PASSWORD_CLAIM_SECRET_BLOCK]

    this.getItem(path, (err, data) => {
      if (data) {
        const username = req.body.ChallengeResponses.USERNAME
        const accessToken = uuid.v1()
        const tokenPath = ['CognitoIdentityServiceProvider', 'accessTokens', username]

        const tokenData = {
          username,
          accessToken
        }

        this.createItem(tokenPath, tokenData, (err, results) => {
          res.json({
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
        reportErr(res, "Simdown: No known challenge with corresponding password secret")
      }
    })
  }

  getUser(opts, req, res) {
    const path = ['CognitoIdentityServiceProvider', 'accessTokens']
    this.listItems(path, req.body, (err, data, config) => {
      let username = undefined
      for (var user of data) {
        if (user.accessToken === req.body.AccessToken) {
          username = user.username
        }
      }

      const userPath = ['CognitoIdentityServiceProvider', 'users', username]
      this.getItem(userPath, (err, data) => {
        res.json(data)
      })
    })
  }

  handleRequest(opts, req, res) {
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
      handler.call(this, opts, req, res)
    } else {
      console.log("UNKNOWN ACTION", action)
    }
  }
}

module.exports = CognitoIdentityServiceProvider
