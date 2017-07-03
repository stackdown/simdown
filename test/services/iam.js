var AWS = require('aws-sdk')
var test = require('tape')
var utils = require('../utils')
var IAMService = require('../../lib/services/iam')

const getIAM = function(endpoints) {
  return new AWS.IAM({
    region: 'us-east-1',
    endpoint: endpoints['IAM']
  })
}

test('IAM', (test) => {
  utils.setup([IAMService], function(err, endpoints, services) {
    const iam = utils.getInstance(endpoints, 'IAM')

    iam.getUser({}, function(err, results) {
      test.equal(err, null, 'should not emit an error')
      test.equal(results.User.UserId, '133713371337', 'should send back the right UserId')
      utils.cleanup(test, services)
    })
  })
})