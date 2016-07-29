/**
 * view/loadView.js
 *
 * Maps url to jade files, which are relative to the views directory
 */

'use strict'; // eslint-disable-line strict

const SSOConfig = require('../db/index').SSOConfig;
const SamlStrategy = require('passport-saml').Strategy;
const viewConfig = require('../viewConfig');
const NOT_FOUND = 404;

// protected urls
const viewmap = {
  '/perspectives': 'refocusIndex/index',
  '/focusGrid': 'focusGrid/focus',
  '/focusRtBracket': 'focusRtBracket/focus',
  '/focusTree': 'focusTree/focus',
};

// public urls
const publicViewmap = {
  '/register': 'authentication/register/register',
};

/**
 * Checks if the user is authenticated and and there is a valid session
 * @param  {Object}   req  Request object
 * @param  {Object}   res  Response object
 * @param  {Function} next The next middleware function in the stack
 * @returns {Function}  next function if authenticated, else redirect to login
 * after setting redirect url query parameter.
 */
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.redirect('/login?ru=' + encodeURIComponent(
    req.protocol + '://' + req.get('host') + req.originalUrl)
  );
}

/**
 * SAML strategy for passport
 * @param  {Object}   profile - User profile parameters
 * @param  {Function} done - Callback function
 * @returns {Function}    Callback function with parameters
 */
function samlStrategy(profile, done) {
  return done(null,
    {
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
    });
}

module.exports = function loadView(app, passport) {
  const keys = Object.keys(viewmap);
  keys.forEach((key) =>
    app.get(
      key,
      ensureAuthenticated,
      (req, res) => res.render(viewmap[key], { user: req.user })
    )
  );

  const publicViewsKeys = Object.keys(publicViewmap);
  publicViewsKeys.forEach((key) =>
    app.get(
      key,
      (req, res) => res.render(publicViewmap[key])
    )
  );

  app.get(
    '/perspectives/:key',
    (req, res) => res.render('lensPerspective/perspective/perspective', {
      eventThrottle: viewConfig.realtimeEventThrottleMilliseconds,
    })
  );

  /**
   * check db ssoconfig in first callback. If found, configure passport and
   * continue, else return Page not found.
   * Here we check db and create new strategy on each request because different
   * route requests can be served by different dyno, hence we need to check db
   * every time and configure passport accordingly.
   */
  app.get('/loginSAML',
    (req, res, next) => {
      SSOConfig.findOne()
      .then((ssoconfig) => {
        if (ssoconfig) {
          passport.use(new SamlStrategy(
            {
              path: '/sso/saml',
              entryPoint: ssoconfig.samlEntryPoint,
              issuer: ssoconfig.samlIssuer,
            }, samlStrategy)
          );

          return next();
        }

        return res.status(NOT_FOUND).send('Page not found');
      })
      .catch(() => res.status(NOT_FOUND).send('Page not found'));
    },

    passport.authenticate(
      'saml',
      {
        successRedirect: '/',
        failureRedirect: '/login',
      }
    )
  );

  /**
   * check db ssoconfig in first callback. If found, configure passport and
   * continue, else return Page not found
   */
  app.post('/sso/saml',
    (req, res, next) => {
      SSOConfig.findOne()
      .then((ssoconfig) => {
        if (ssoconfig) {
          passport.use(new SamlStrategy(
            {
              path: '/sso/saml',
              entryPoint: ssoconfig.samlEntryPoint,
              issuer: ssoconfig.samlIssuer,
            }, samlStrategy)
          );

          return next();
        }

        return res.status(NOT_FOUND).send('Page not found');
      })
      .catch(() => res.status(NOT_FOUND).send('Page not found'));
    },

    passport.authenticate('saml',
      {
        failureRedirect: '/login',
      }),
      (_req, _res) => {
        _res.redirect('/');
      }
  );

  /**
   * SSO Config option is added/removed on login view based on sso config
   * existence in db. This code executes on every login view rendering.
   */
  app.get(
    '/login',
    (req, res, next) => {
      res.locals.SSOExists = false;
      SSOConfig.findOne()
      .then((ssoconfig) => {
        if (ssoconfig) {
          res.locals.SSOExists = true;
        } else {
          res.locals.SSOExists = false;
        }

        next();
      })
      .catch(() => {
        res.locals.SSOExists = false;
      });
    },

    (req, res/* , next*/) => {
      res.render('authentication/login/login');
    }
  );

  // Redirect '/v1' to '/v1/docs'.
  app.get('/v1', (req, res) => res.redirect('/v1/docs'));
}; // exports
