if (process.argv[2] === '--debug' || process.argv[2] === 'debug') {
  process.env.DEBUG = process.argv[3] || 'simdown*'
}

require('./module')
require('./services/iam')
require('./services/cognito_identity')
require('./services/cognito_identity_service_provider')