const email = require('emailjs')
const { SMTPServer } = require('smtp-server')

exports.waitForEmail = (callback) => {
  const server = new SMTPServer({
    logger: false,
    authOptional: true,
    onData(stream, session, done) {
      let allData = ''
      stream.on('data', (data) => {
        allData += data.toString()
      })

      stream.on('end', () => {
        done()
        server.close(() => {
          callback(null, allData)
        })
      })
    }
  })

  server.listen(25252)
}

exports.sendEmail = (text, callback) => {
  const server = email.server.connect({
    ssl: false,
    port: 25252,
    host: 'localhost',
    username: 'testuser1234',
    password: 'Amazingpass123.',
  })

  const message = email.message.create({
    to: 'test@localhost',
    text: text,
    from: 'stackdown tests',
    subject: 'test123'
  })

  server.send(message, (err, message) => {
    // console.log("SEND MESSAGE RESULTS", err, message)
    callback(err)
  })
}