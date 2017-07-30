const AWS = require('aws-sdk')

AWS.config = new AWS.Config()
AWS.config.accessKeyId = 'accessKey'
AWS.config.secretAccessKey = 'secretKey'
AWS.config.region = 'us-east-1'

if (process.argv[2] === '--debug' || process.argv[2] === 'debug') {
  process.env.DEBUG = process.argv[3] || 'simdown*'
}

require('./hooks')
require('./state')
require('./module')
require('./services/iam')
require('./services/dynamo')
require('./services/kinesis')
require('./services/api_gateway')
require('./services/cognito_identity')
require('./services/cognito_identity_service_provider')