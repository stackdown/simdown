const uuid = require('uuid')
const shortid = require('shortid')
const queryString = require('query-string')
const BaseService = require('../base_service')

class IAM extends BaseService {
  handlers() {
    return {
      "POST /": this.handleRequest.bind(this)
    }
  }

  setup(db, opts, callback) {
    this.disableParsing = true
    this.port = opts.port || 14352
    super.setup.apply(this, arguments)
  }

  getUser(opts, req, res) {
    res.send(`
      <GetUserResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
        <GetUserResult>
          <User>
            <UserId>133713371337</UserId>
            <Path>/division_abc/subdivision_xyz/</Path>
            <UserName>Bob</UserName>
            <Arn>arn:aws:iam::133713371337:user/division_abc/subdivision_xyz/Bob</Arn>
            <CreateDate>2013-10-02T17:01:44Z</CreateDate>
            <PasswordLastUsed>2014-10-10T14:37:51Z</PasswordLastUsed>
          </User>
        </GetUserResult>
        <ResponseMetadata>
          <RequestId>${uuid.v1()}</RequestId>
        </ResponseMetadata>
      </GetUserResponse>
    `)
  }

  updateRole(opts, req, res) {
    const poolId = req.body.UserPoolId
    this.updateItem(['IAM', 'roles', poolId], req.body, (err, data) => {
      res.json({
        UserPool: data
      })
    })
  }

  deleteRole(opts, req, res) {
    const poolId = req.body.UserPoolId
    const path = ['IAM', 'roles', poolId]
    this.deleteItem(path, poolId, (err, data) => {
      res.end()
    })
  }

  describeRole(opts, req, res) {
    const poolId = req.body.UserPoolId
    const path = ['IAM', 'roles', poolId]
    this.getItem(path, (err, data) => {
      res.json({
        UserPool: data
      })
    })
  }

  getHandler(data) {
    let _this = this
    
    function roleXML(roleData) {
      return `
        <Path>${roleData.Path || '/'}</Path>
        <Arn>arn:aws:iam::133713371337:role/${roleData.Path || '/'}/${roleData.RoleName}</Arn>
        <RoleName>${roleData.RoleName}</RoleName>
        <Description>${roleData.Description}</Description>
        <AssumeRolePolicyDocument>${roleData.AssumeRolePolicyDocument}</AssumeRolePolicyDocument>
        <CreateDate>2012-05-08T23:34:01.495Z</CreateDate>
        <RoleId>${roleData.RoleId}</RoleId>
      `
    }

    return {

      CreateRole: (opts, req, res) => {
        data.RoleId = `${shortid.generate().toUpperCase()}${shortid.generate().toUpperCase()}`
        this.createItem(['IAM', 'roles', data.RoleName], data, (err, results) => {
          res.send(`
            <CreateRoleResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
              <CreateRoleResult>
                <Role>${roleXML(data)}</Role>
              </CreateRoleResult>
              <ResponseMetadata>
                <RequestId>4a93ceee-9966-11e1-b624-b1aEXAMPLE7c</RequestId>
              </ResponseMetadata>
            </CreateRoleResponse>
          `)
        })
      },

      GetRole: (opts, req, res) => {
        const name = data.RoleName
        const path = ['IAM', 'roles', name]

        this.getItem(path, (err, data) => {
          res.send(`
            <GetRoleResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
              <GetRoleResult>
                <Role>${roleXML(data)}</Role>
              </GetRoleResult>
            </GetRoleResponse>
          `)
        })
      },

      ListRoles: (opts, req, res) => {
        const path = ['IAM', 'roles']
        this.listItems(path, data, (err, items) => {
          const members = []
          for (var item of items) {
            members.push(`<member>${roleXML(item)}</member>`)
          }

          res.send(`
            <ListRolesResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
              <ListRolesResult>
                <IsTruncated>false</IsTruncated>
                <Roles>
                  ${members}
                </Roles>
              </ListRolesResult>
            </ListRolesResponse>
          `)
        })
      },

      DeleteRole: (opts, req, res) => {
        const name = data.RoleName
        const path = ['IAM', 'roles', name]

        this.deleteItem(path, name, (err, data) => {
          res.send(`
            <DeleteRoleResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/"></DeleteRoleResponse>
          `)
        })
      },

      UpdateRoleDescription: (opts, req, res) => {
        const update = {
          Description: data.Description
        }

        this.updateItem(['IAM', 'roles', data.RoleName], update, (err, results) => {
          res.send(`
            <UpdateRoleResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
              <UpdateRoleResult>
                <Role>${roleXML(results)}</Role>
              </UpdateRoleResult>
              <ResponseMetadata>
                <RequestId>4a93ceee-9966-11e1-b624-b1aEXAMPLE7c</RequestId>
              </ResponseMetadata>
            </UpdateRoleResponse>
          `)
        })
      }

    }[data.Action]
  }

  handleRequest(opts, req, res) {
    let _this = this
    let allData = ''

    req.on('data', (data) => {
      allData += data.toString()
    })

    req.on('end', () => {
      const data = queryString.parse(allData)
      _this.getHandler(data)(opts, req, res)
    })

  }
}

module.exports = IAM