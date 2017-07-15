# SimDown

Faithful simulation of AWS Cloud Services using node.js and leveldb, useful for testing interactions with AWS

[![Build Status](https://travis-ci.org/stackdown/simdown.svg?branch=master)](https://travis-ci.org/stackdown/simdown)

## Highlights

- State Management - capture, save, and restore state for all APIs
- API Call Hooks - callbacks before and after any API call
- 100% node.js - no need for external dependencies
- Performance - all services can be run in-process for better performance, debugging, and flexibility
- Custom storage - optionally provide your own leveldb storage, or any other *-down store
- Multi-API flows - test interaction across multiple APIs, eg. hook up an API gateway to a lambda, and trigger the lambda via http

#### Services
    
- APIGateway (coming soon)
- CognitoIdentity
- CognitoIdentityServiceProvider
- Kinesis (via [kinesalite](https://github.com/mhart/kinesalite))
- DynamoDB (via [dynalite](https://github.com/mhart/dynalite))
- Lambda (coming soon)
- IAM (roles only)
- SQS (coming soon)
- SNS (coming soon)

## Why SimDown?

Testing applciations that work with AWS API's can be difficult because there's no way to simulate them locally. Existing solutions like [localstack](https://github.com/localstack/localstack) are awesome (!) but they have a few important shortcomings:

- No ability to save/restore API state
- No hooks before/after method calls
- Missing important services
- Multiple languages and binary dependencies

SimDown launches a series of http servers that simulate AWS services. The services can interact with each other to properly simulate Amazon's real system. In the background SimDown keeps track of AWS state using leveldb, which allows a lot of flexible storage options.

## Usage

### Server

Setup a SimDown server

```JavaScript
  const SimDown = require('simdown')

  const simdown = new SimDown()
  simdown.setup((err, endpoints) => {
    console.log(endpoints['CognitoIdentity'])   // http://localhost:14353
  })
```

Close down a running server

```JavaScript
  simdown.stop(() => {
    console.log("Finished cleaning up")
  })
```

### Client

To use SimDown, simply use the `endpoint` option of the AWS SDK (works from browser, node, python, Java, or any AWS SDK)

```JavaScript
  const AWS = require('aws-sdk')

  const cognito = new AWS.CognitoIdentity({
    region: 'us-east-1',
    endpoint: 'http://localhost:14353'
  })
```

### Hooks

Hooks allow you to specify functions to be called before/after a given API call. They'll be passed a copy of the incoming request for inspection/modification.

```JavaScript
  function beforeTableCreate(callPath, data, done) {
    console.log("Before", callPath.join(':')) // outputs "Before DynamoDB:CreateTable"
    done()
  }

  const simdown = new SimDown({
    hooks: {
      'DynamoDB:CreateTable:before': beforeTableCreate
    }
  })
```

### Thanks

Coverage for DynamoDB and Kinesis come from [mhart](https://github.com/mhart)'s excellent simulators:

- Kinesis: https://github.com/mhart/kinesalite
- DynamoDB: https://github.com/mhart/dynalite
