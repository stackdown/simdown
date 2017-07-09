# SimDown

Faithful simulation of AWS Cloud Services using node.js and leveldb, useful for testing interactions with AWS

[![Build Status](https://travis-ci.org/stackdown/simdown.svg?branch=master)](https://travis-ci.org/stackdown/simdown)

## Why SimDown?

Testing applciations that work with AWS API's is difficult. Fortunately all AWS SDK's are built with an option to send requests to a custom endpoint. SimDown launches a series of http servers that simulate AWS services, and can interact with eachother to properly simulate a real production system. In the background, we keep track of AWS state using leveldb, which allows us a lot of flexible storage options.

#### Highlights

- 100% node.js - no need for external dependencies
- All services can be run in-process (but don't have to be), meaning better debugging and flexibility
- Custom storage - provide your own leveldb storage, or any other *-down store
- Saved states - capture, save, and restore state for all APIs
- Hooks - callbacks before and after any API call
- Multi-API flows - test interaction across multiple APIs, eg. hook up an API gateway to a lambda, and trigger the lambda via http

#### Services
    
- IAM
- DynamoDB
- CognitoIdentity
- CognitoIdentityServiceProvider

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

## Progress

### IAM

- GetRole ✓
- ListRoles ✓
- CreateRole ✓
- DeleteRole ✓
- UpdateRoleDescription ✓

### CognitoIdentity

- ListIdentityPools ✓
- CreateIdentityPool ✓
- UpdateIdentityPool ✓
- DeleteIdentityPool ✓
- DescribeIdentityPool ✓

### CognitoIdentityServiceProvider

- SignUp ✓
- GetUser ✓
- InitiateAuth ✓
- ConfirmSignUp ✓
- ListUserPools ✓
- CreateUserPool ✓
- UpdateUserPool ✓
- DeleteUserPool ✓
- DescribeUserPool ✓
- ListUserPoolClients ✓
- CreateUserPoolClient ✓
- UpdateUserPoolClient ✓
- DeleteUserPoolClient ✓
- DescribeUserPoolClient ✓
- RespondToAuthChallenge ✓
