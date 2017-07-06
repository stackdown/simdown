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

// test('IAM', (test) => {
//   utils.setup([IAMService], (err, endpoints, services) => {
//     const iam = utils.getInstance(endpoints, 'IAM')

//     iam.getUser({}, (err, results) => {
//       test.equal(err, null, 'should not emit an error')
//       test.equal(results.User.UserId, '133713371337', 'should send back the right UserId')
//       utils.cleanup(test, services)
//     })
//   })
// })

const roleTestConfig = utils.testCrud(test, {
  // only: 'remove',
  methods: {
    get: (makeCall, name) => ({
      params: {
        RoleName: name
      },
      method: ['IAM', 'getRole']
    }),
    
    create: (makeCall, id) => ({
      params: {
        RoleName: 'test-role',
        Description: 'original description',
        AssumeRolePolicyDocument: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: {
              Service: ['ec2.amazonaws.com']
            },
            Action: ['sts:AssumeRole']
          }]
        })
      },
      method: ['IAM', 'createRole']
    }),

    list: (makeCall, context) => ({
      params: {
        MaxItems: 0
      },
      method: ['IAM', 'listRoles']
    }),

    remove: (makeCall, name, context) => ({
      params: {
        RoleName: name
      },
      method: ['IAM', 'deleteRole']
    }),

    update: (makeCall, name, context) => ({
      params: {
        RoleName: name,
        Description: 'updated description'
      },
      method: ['IAM', 'updateRoleDescription']
    }),
    
  },
  listPath: 'Roles',
  updatePaths: [
    ['Role', 'Description']
  ],
  schema: {
    id: (data) => (data.Role ? data.Role.RoleName : data.RoleName),
  },
  Services: [IAMService],
  namespace: ['IAM', 'roles']
})

