const express = require('express')
const exphbs = require('express-handlebars')
const compression = require('compression')
const cookieSession = require('cookie-session')
const passport = require('passport')
const TumblrStrategy = require('./lib/passport-tumblr-fix').Strategy
const flash = require('connect-flash')
const qs = require('querystring')
const favicon = require('serve-favicon')
const scheduleReblog = require('./lib/schedule-reblog')

const env = process.env

const tumblrStrategy = new TumblrStrategy({
  consumerKey: env.TUMBLR_APP_KEY,
  consumerSecret: env.TUMBLR_SECRET_KEY,
  callbackURL: `http://${(env.HOST || 'localhost:8080')}/auth/tumblr/callback`
}, (token, tokenSecret, profile, done) => {
  done(null, {
    id: profile.username,
    token: token,
    secret: tokenSecret
  })
})
passport.use(tumblrStrategy)
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((hash, done) => done(null, hash))

const app = express()

app.use(favicon(__dirname + '/static/img/favicon.ico'))
app.use(compression())
app.use(cookieSession({
  secret: env.COOKIE_SECRET || 'shhhh',
  secure: false
}))
app.use(flash())
app.use(passport.initialize())

var hbs = exphbs.create()

app.engine('hbs', hbs.engine)
app.set('view engine', 'hbs')

app.use('/static', express.static(__dirname + '/static'))

app.get('/robots.txt', function (req, res) {
  res.type('text/plain')
  res.send('User-agent: *\nDisallow: /')
})

if (env.HOME_URL) app.get('/', (req, res) => res.redirect(303, env.HOME_URL))

app.get('/schedule', (req, res) => {
  const error = !!req.query.error
  delete req.query.error
  res.render('schedule', {
    error,
    link: `http://${(env.HOST || 'localhost:8080')}/schedule/confirm?` + qs.stringify(req.query)
  })
})

app.get('/schedule/confirm', (req, res, next) => {
  if (!Date.parse(req.query.date) || !req.query.post || !(req.query.blog || env.BLOG)) return res.sendStatus(400)
  req.flash('postTumblrAuth') // clear the flash
  req.flash('postTumblrAuth', {
    action: 'SCHEDULE_REBLOG',
    data: req.query
  })
  next()
}, passport.authenticate('tumblr'))

app.get('/auth/tumblr/callback', (req, res) => passport.authenticate('tumblr', (err, user) => {
  if (err) console.log(err.stack || err)
  err = err || !user
  const flash = req.flash('postTumblrAuth')[0]
  if (err) return res.redirect(303, '/schedule?error=1&' + (flash && qs.stringify(flash.data)))
  switch (flash && flash.action) {
    case 'SCHEDULE_REBLOG':
      scheduleReblog(flash.data, user)
        .then(_ => res.redirect('/schedule/success'))
        .catch(err => {
          console.log(err.stack || err)
          res.redirect(303, '/schedule?error=1&' + qs.stringify(flash.data))
        })
      break
    default:
      res.redirect(303, '/')
  }
})(req, res))

app.get('/schedule/success', (req, res) => res.render('schedule/success'))

app.listen(8080)
