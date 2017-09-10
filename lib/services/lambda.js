const uuid = require('uuid')
const extend = require('extend')
const shortid = require('shortid')
const BaseService = require('../base_service')

function reportErr(res, err) {
  res.status(400)
  res.header('x-amzn-errortype', 'ServiceError')
  res.json({
    message: err.message,
    code: 'ServiceError'
  })
}

class Lambda extends BaseService {
  handlers() {
    return {
      "GET /:apiVerison/functions": this.getHandler('ListFunctions'),
      "POST /:apiVerison/functions": this.getHandler('CreateFunction'),
      "GET /:apiVerison/functions/:functionName": this.getHandler('GetFunction'),
      "PATCH /:apiVerison/functions/:functionName": this.getHandler('UpdateFunction'),
      "DELETE /:apiVerison/functions/:functionName": this.getHandler('DeleteFunction'),

      "POST /:apiVerison/functions/:functionName/invocations": this.getHandler('Invoke'),
      "POST /:apiVerison/functions/:functionName/invoke-async": this.getHandler('InvokeAsync'),
    }
  }

  setup(db, opts, callback) {
    this.port = opts.port || 31254
    this.disableParsing = true
    super.setup.apply(this, arguments)
  }

  updateFromPatchOpts(patchOps) {
    let update = {}

    for (let patchOp of patchOps) {
      const path = patchOp.path.split('/')

      switch (patchOp.op) {
        case 'add': {
          this.setDeepVal(update, path, patchOp.value)
          break
        }

        case 'replace': {
          this.setDeepVal(update, path, patchOp.value)
          break
        }

        case 'remove': {
          this.setDeepVal(update, path)
          break
        }
      }
    }

    return update
  }

  createFunction(opts, data, callback) {
    const resourceId = shortid.generate()

    data.functionName = data.FunctionName
    delete data.FunctionName

    const rootResource = {
      id: resourceId,
      path: '/'
    }

    this.createItem(['Lambda', 'functions', data.functionName], data, (err, results) => {
      results.FunctionName = results.functionName
      delete results.functionName
      callback(err, results)
    })
  }

  listFunctions(opts, data, callback) {
    const path = ['Lambda', 'functions']
    this.listItems(path, data, (err, data, config) => {
      for (let item of data) {
        item.FunctionName = item.functionName
        delete item.functionName
      }

      callback(err, {
        Functions: data,
        NextMarker: config.position
      })
    })
  }

  updateFunction(opts, data, callback) {
    const id = data.restApiId
    delete data.restApiId

    const patchOps = data.patchOperations || []
    const update = this.updateFromPatchOpts(patchOps)

    this.updateItem(['Lambda', 'functions', id], update, callback)
  }

  deleteFunction(opts, data, callback) {
    const id = data.functionName
    const path = ['Lambda', 'functions', id]
    this.deleteItem(path, id, (err, data) => {
      callback(err)
    })
  }

  getFunction(opts, data, callback) {
    const name = data.functionName
    const path = ['Lambda', 'functions', name]
    this.getItem(path, (err, results) => {

      let retval = {
        Code: results.code,
        Tags: results.tags,
        Configuration: results
      }

      callback(err, retval)
    })
  }

  getHandler(method) {
    return (opts, req, res) => {
      let allData = ''
      req.on('data', (data) => {
        allData += data.toString()
      })

      req.on('error', (err) => {
        console.log("REQUEST ERROR", err)
      })

      req.on('end', () => {
        let bodyData = {}
        try {
          bodyData = JSON.parse(allData)
        } catch(e) {
          bodyData = {}
        }

        const data = extend(true, bodyData, req.params)

        const handlers = {
          GetFunction: this.getFunction,
          ListFunctions: this.listFunctions,
          CreateFunction: this.createFunction,
          UpdateFunction: this.updateFunction,
          DeleteFunction: this.deleteFunction,
        }

        const handler = handlers[method]

        if (handler) {
          this.reportCall(['Lambda', method, 'before'], {data: data}, () => {
            handler.call(this, opts, data, (err, results) => {
              this.reportCall(['Lambda', method, 'after'], {data: data, err, results}, () => {
                if (err) {
                  reportErr(res, err)
                } else {
                  res.json(results)
                }
              })
            })
          })
        } else {
          console.log("UNKNOWN METHOD", method)
        }
      })
    }
  }

}

module.exports = Lambda
