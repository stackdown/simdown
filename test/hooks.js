const AWS = require('aws-sdk')
const test = require('tape')
const utils = require('./utils')
const SimDown = require('../')
const BaseService = require('../lib/base_service')
const DynamoService = require('../lib/services/dynamo')

test('hook reporting', (test) => {
  let hasBefore = false
  let hasAfter = false

  const beforeFn = (path, data, done) => {
    hasBefore = true
    done()
  }

  const afterFn = (path, data, done) => {
    hasAfter = true
    done()
  }

  const component = new BaseService({
    hooks: {
      'TestComponent:FakeMethod:before': beforeFn,
      'TestComponent:FakeMethod:after': afterFn
    }
  })

  component.reportCall(['TestComponent', 'FakeMethod', 'before'], {}, () => {
    component.reportCall(['TestComponent', 'FakeMethod', 'after'], {}, () => {
      test.equal(hasBefore, true, 'should get before hook callback')
      test.equal(hasAfter, true, 'should get after hook callback')

      test.end()
    })
  })
})

test('hooks during method calls', (test) => {
  let hasBefore = false
  let hasAfter = false

  const beforeFn = (path, data, done) => {
    hasBefore = true
    done()
  }

  const afterFn = (path, data, done) => {
    hasAfter = true
    done()
  }

  let opts = {
    Services: [DynamoService],
    hooks: {
      'DynamoDB:CreateTable:before': beforeFn,
      'DynamoDB:CreateTable:after': afterFn
    }
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

    const dynamo = new AWS.DynamoDB({
      region: 'us-east-1',
      endpoint: endpoints['DynamoDB']
    })

    dynamo.createTable(params, (err, results) => {
      test.equal(err, null, 'should create table without error')
      test.equal(hasBefore, true, 'should get before hook callback')
      test.equal(hasAfter, true, 'should get after hook callback')
      utils.cleanup(test, services)
    })
  })
})