const level = require('level')

let globalDb = undefined

exports.setup = function(callback) {
  if (globalDb === undefined) {
    const dbPath = require('path').resolve(__dirname, '../db')
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