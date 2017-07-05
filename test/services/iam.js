const AWS = require('aws-sdk')
const test = require('tape')
const utils = require('../utils')
const IAMService = require('../../lib/services/iam')

const getIAM = (endpoints) => {
  return new AWS.IAM({
    region: 'us-east-1',
    endpoint: endpoints['IAM']
  })
}

test('IAM', (test) => {
  utils.setup([IAMService], (err, endpoints, services) => {
    const iam = utils.getInstance(endpoints, 'IAM')

    iam.getUser({}, (err, results) => {
      test.equal(err, null, 'should not emit an error')
      test.equal(results.User.UserId, '133713371337', 'should send back the right UserId')
      utils.cleanup(test, services)
    })
  })
})