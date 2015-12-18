const TumblrStrategy = require('passport-tumblr').Strategy
const url = require('url')

// Fix TumblrStrategy. Tumblr doesn't callback with any error parameter when users decline authorization
const oAuthStrategyAuthenticate = TumblrStrategy.prototype.authenticate
TumblrStrategy.prototype.authenticate = function (req, options) {
  if (req.url === url.parse(this._callbackURL).path) return this.fail()
  oAuthStrategyAuthenticate.call(this, req, options)
}

exports.Strategy = TumblrStrategy
