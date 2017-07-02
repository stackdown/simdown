const uuid = require('uuid')
const queryString = require('query-string')
const BaseService = require('../base_service')

class IAM extends BaseService {
  handlers() {
    return {
      "POST /": this.handleIAMRequest.bind(this)
    }
  }

  setup(opts, callback) {
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

  handleIAMRequest(opts, req, res) {
    let _this = this
    let allData = ''

    req.on('data', function(data) {
      allData += data.toString()
    })

    req.on('end', function() {
      const data = queryString.parse(allData)

      switch (data.Action) {
        case 'GetUser':
          _this.getUser(opts, req, res)
          break
        default:
          console.log("WTF UNKNOWN ACTION", data)
          break
      }
    })

  }
}

module.exports = IAM