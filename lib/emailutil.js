const email = require('emailjs')
const { SMTPServer } = require('smtp-server')

const EMAIL_PORT = 25252

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

  server.listen(EMAIL_PORT)
}

exports.sendEmail = (text, callback) => {
  const server = email.server.connect({
    ssl: false,
    port: EMAIL_PORT,
    host: 'localhost',
    username: 'testuser1234',
    password: 'Amazingpass123.',
  })

  const message = email.message.create({
    to: 'test@localhost',
    text: text,
    from: 'simdown tests',
    subject: 'test123'
  })

  server.send(message, (err, message) => {
    callback(err)
  })
}