const nodemailer = require('nodemailer')
const env = process.env

const transporter = nodemailer.createTransport({
  service: env.MAIL_SERVICE || 'Gmail',
  auth: {
    user: env.MAIL_USER,
    pass: env.MAIL_PASSWORD
  }
})

const sendMail = (subject, html) => new Promise((resolve, reject) => transporter.sendMail({
  to: env.MAIL_TO,
  subject,
  html
}, err => err ? reject(err) : resolve()))

module.exports = env.MAIL_TO ? sendMail : _ => Promise.resolve()
