const fs = require('fs')
const AWS = require('aws-sdk')
const test = require('tape')
const async = require('async')
const utils = require('./utils')
const SimDown = require('../')
const DynamoService = require('../lib/services/dynamo')

test('state save/load', (test) => {
  let opts = {}
  const simdown = new SimDown()
  const archivePath = require('path').resolve(__dirname, '../archives/testSave.zip')

  async.waterfall([
    // Setup the test
    (done) => {
      simdown.setup(opts, done)
    },

    // Create a DynamoDB table
    (endpoints, services, done) => {
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
        done(err, dynamo)
      })
    },

    // Save the current state (with the table in it)
    (dynamo, done) => {
      const saveOpts = {
        name: 'testSave'
      }

      test.equal(fs.existsSync(archivePath), false, 'should start with no archive')

      simdown.saveState(saveOpts, (err) => {
        test.equal(err, null, 'should save state without error')
        test.equal(fs.existsSync(archivePath), true, 'should have generated an archive')
        done(err, dynamo)
      })
    },

    // Remove the table and verify that it's gone
    (dynamo, done) => {
      const params = {
        TableName: 'simdown-test'
      }

      dynamo.deleteTable(params, (err, results) => {
        dynamo.listTables({}, (err, results) => {
          test.equal(results.TableNames.indexOf('simdown-test'), -1, 'should have successfully deleted the table')
          done(err, dynamo)
        })
      })
    },

    // Load the previous state and verify it brought the table back
    (dynamo, done) => {
      simdown.loadState('testSave', {}, (err) => {
        dynamo.listTables({}, (err, results) => {
          test.notEqual(results.TableNames.indexOf('simdown-test'), -1, 'should have loaded the state with the table present')
          done(err, dynamo)
        })
      })
    },

    (dynamo, done) => {
      simdown.removeState('testSave', {}, (err) => {
        test.equal(err, null, 'should remove state without error')
        test.equal(fs.existsSync(archivePath), false, 'should have removed the archived state')
        done(err, dynamo)
      })
    },

  ], (err) => {
    test.equal(err, null, 'should have gotten through without error')

    simdown.stop((err) => {
      simdown.cleanup((err) => {
        test.end()
      })
    })
  })

})
