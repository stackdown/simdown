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

  getUser(opts, data, callback) {
    callback(null, `
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

      CreateRole: (opts, data, callback) => {
        data.RoleId = `${shortid.generate().toUpperCase()}${shortid.generate().toUpperCase()}`
        this.createItem(['IAM', 'roles', data.RoleName], data, (err, results) => {
          callback(err, `
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

      GetRole: (opts, data, callback) => {
        const name = data.RoleName
        const path = ['IAM', 'roles', name]

        this.getItem(path, (err, data) => {
          callback(err, `
            <GetRoleResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/">
              <GetRoleResult>
                <Role>${roleXML(data)}</Role>
              </GetRoleResult>
            </GetRoleResponse>
          `)
        })
      },

      ListRoles: (opts, data, callback) => {
        const path = ['IAM', 'roles']
        this.listItems(path, data, (err, items) => {
          const members = []
          for (var item of items) {
            members.push(`<member>${roleXML(item)}</member>`)
          }

          callback(err, `
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

      DeleteRole: (opts, data, callback) => {
        const name = data.RoleName
        const path = ['IAM', 'roles', name]

        this.deleteItem(path, name, (err, data) => {
          callback(err, `
            <DeleteRoleResponse xmlns="https://iam.amazonaws.com/doc/2010-05-08/"></DeleteRoleResponse>
          `)
        })
      },

      UpdateRoleDescription: (opts, data, callback) => {
        const update = {
          Description: data.Description
        }

        this.updateItem(['IAM', 'roles', data.RoleName], update, (err, results) => {
          callback(err, `
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
    let allData = ''

    req.on('data', (data) => {
      allData += data.toString()
    })

    req.on('end', () => {
      const data = queryString.parse(allData)

      this.reportCall(['IAM', data.Action, 'before'], {data}, () => {
        this.getHandler(data)(opts, data, (err, results) => {
          this.reportCall(['IAM', data.Action, 'after'], {data, err, results}, () => {
            if (err) {
              console.log("IAM ERROR", err)
            } else if(results && results.constructor === String) {
              res.send(results)
            } else {
              res.json(results)
            }
          })
        })
      })
    })

  }
}

module.exports = IAM