const AWS = require('aws-sdk')
const test = require('tape')
const utils = require('../utils')
const DynamoService = require('../../lib/services/dynamo')

test('dynamo table creation', (test) => {
  let opts = {
    Services: [DynamoService]
  }

  utils.setup(opts, (err, endpoints, services) => {
    const makeCall = opts.makeCall

    const params = {
      TableName: 'simdown-test', 
      AttributeDefinitions: [
        { AttributeName: 'identifier', AttributeType: 'S' },
        { AttributeName: "start", AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'identifier', KeyType: 'HASH' },
        { AttributeName: 'start', KeyType: 'RANGE' }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      }
    }

    makeCall(['DynamoDB', 'createTable'], params, null, (err, results) => {
      test.equal(err, null, 'should create table without error')

      test.equal(results.TableDescription.TableName, 'simdown-test', 'should have created table and returned with data')

      utils.cleanup(test, services)
    })
  })
})