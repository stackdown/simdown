const level = require('level')

exports.setup = function(callback) {
  const dbPath = require('path').resolve(__dirname, '../db')
  const db = level(dbPath)
  callback(null, db)
}

exports.put = function(db, path, data, callback) {
  key = path.join('|')
  db.put(key, JSON.stringify(data), function(err) {
    callback(err)
  })
}