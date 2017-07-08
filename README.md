# SimDown

Faithful simulation of AWS Cloud Services using node.js and leveldb

[![Build Status](https://travis-ci.org/stackdown/simdown.svg?branch=master)](https://travis-ci.org/stackdown/simdown)

## Highlights

- 100% native, well tested es6 node.js
- All services running in process (or optioanlly in their own processes) for debugging and flexibility
- Starting with services not covered by competing libraries like [localstack](https://github.com/atlassian/localstack)
    - IAM
    - CognitoIdentity
    - CognitoIdentityServiceProvider

## Status

Under active development. See Progress section.

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

To use SimDown, simply use the `endpoint` option of the AWS SDK (works from browser, node, or any AWS SDK)

```JavaScript
  const AWS = require('aws-sdk')

  const cognito = new AWS.CognitoIdentity({
    region: 'us-east-1',
    endpoint: 'http://localhost:14353'
  })
```

## Progress

A list of endpoints with implementation and some level of testing

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
