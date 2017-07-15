const AWS = require('aws-sdk')
const test = require('tape')
const utils = require('../utils')
const KinesisService = require('../../lib/services/kinesis')

test('kinesis stream creation', (test) => {
  let opts = {
    Services: [KinesisService]
  }

  utils.setup(opts, (err, endpoints, services) => {
    const makeCall = opts.makeCall

    const params = {
      StreamName: 'test-stream',
      ShardCount: 1
    }

    makeCall(['Kinesis', 'createStream'], params, null, (err, results) => {
      test.equal(err, null, 'should create stream without error')
      utils.cleanup(test, services)
    })
  })
})