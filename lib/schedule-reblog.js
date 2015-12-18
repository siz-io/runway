const request = require('request-promise').defaults({
  json: true
})
const oauthFactory = require('oauth-1.0a')
const sendMail = require('./send-mail')

const env = process.env
const timeShift = (Number(process.env.TIME_DIFFERENCE) || 0) * 3600000

const oauth = oauthFactory({
  consumer: {
    public: env.TUMBLR_APP_KEY,
    secret: env.TUMBLR_SECRET_KEY
  }
})

const oauthRequest = (token, requestData) => request({
  url: requestData.url,
  method: requestData.method,
  form: oauth.authorize(requestData, token)
})

module.exports = (data, user, cb) => {
  const token = {
    public: user.token,
    secret: user.secret
  }

  return request(`https://api.tumblr.com/v2/blog/${(data.blog || env.BLOG)}.tumblr.com/posts?id=${data.post}&api_key=${env.TUMBLR_APP_KEY}`)
    .then(body => body.response.posts[0])
    .then(postInfo => oauthRequest(token, {
      url: `https://api.tumblr.com/v2/blog/${user.id}.tumblr.com/post/reblog`,
      method: 'POST',
      data: {
        id: postInfo.id,
        reblog_key: postInfo.reblog_key,
        state: 'queue',
        publish_on: (new Date(Date.parse(data.date) - timeShift)).toISOString()
      }
    }).then(_ => {
      // Don't return it because we want to send the mail as a "side effect"
      sendMail(user.id + ' has scheduled a reblog',
        user.id + ' has scheduled a reblog for <a href="' + postInfo.post_url + '">' + postInfo.post_url + '</a> on ' + data.date
      ).catch(err => console.log(err.stack || err))
    }))

  // return oauthRequest(token, {
  //   url: `https://api.tumblr.com/v2/blog/${user.id}.tumblr.com/post`,
  //   method: 'POST',
  //   data: {
  //     type: 'text',
  //     body: 'Hello World !'
  //   }
  // })
}
