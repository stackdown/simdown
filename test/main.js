const AWS = require('aws-sdk')

AWS.config = new AWS.Config()
AWS.config.accessKeyId = 'accessKey'
AWS.config.secretAccessKey = 'secretKey'
AWS.config.region = 'us-east-1'

console.log(require('fs').readdirSync(require('path').resolve(__dirname, '../node_modules/amazon-cognito-identity-js'))

if (process.argv[2] === '--debug' || process.argv[2] === 'debug') {
  process.env.DEBUG = process.argv[3] || 'simdown*'
}

require('./module')
require('./services/iam')
require('./services/cognito_identity')
require('./services/cognito_identity_service_provider')