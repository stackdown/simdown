const fs = require('fs')
const level = require('level')
const rimraf = require('rimraf')
const extend = require('extend')

const dbPath = require('path').resolve(__dirname, '../db')
let globalDb = undefined

function nextLetter(s) {
  return s.replace(/([a-zA-Z])[^a-zA-Z]*$/, function(a) {
    var c = a.charCodeAt(0)
    switch(c){
      case 90: return 'A'
      case 122: return 'a'
      default: return String.fromCharCode(++c)
    }
  })
}

exports.setup = function(callback) {
  if (globalDb === undefined) {
    globalDb = level(dbPath)
  }

  callback(null, globalDb)
}

exports.put = function(db, path, data, callback) {
  key = path.join('|')
  db.put(key, JSON.stringify(data), function(err) {
    callback(err)
  })
}

exports.list = function(db, path, opts, callback) {
  const startKey = path.join('|')
  const lastPathItem = path[path.length-1]

  let endKey = path.join('|')

  endKey = endKey.split('')
  endKey[endKey.length - lastPathItem.length] = nextLetter(lastPathItem[0])
  endKey = endKey.join('')

  const query = {
    gt: startKey,
    lt: endKey
  }

  stream = db.createReadStream(query)

  let count = 0
  let items = []
  const limit = opts.limit || 1000
  const offset = opts.offset || 0

  stream.on('data', function(data) {
    count += 1

    const item = JSON.parse(data.value)

    if (count >= offset) {
      items.push(item)

      if (items.length >= limit) {
        stream.end()
      }
    }
  })

  stream.on('error', function(err) {
    console.log("STREAM ERR", err)
  })

  stream.on('end', function() {
    callback(null, items)
  })
}

exports.cleanup = function(callback) {
  globalDb.close(function(err) {
    if (err) {return callback(err)}

    rimraf(dbPath, function(err) {
      globalDb = undefined
      callback(err)
    })
  })
}