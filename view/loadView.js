/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * view/loadView.js
 *
 * Maps url to jade files, which are relative to the views directory
 */

'use strict'; // eslint-disable-line strict

const SSOConfig = require('../db/index').SSOConfig;
const User = require('../db/index').User;
const Profile = require('../db/index').Profile;
const SamlStrategy = require('passport-saml').Strategy;
const viewConfig = require('../viewConfig');
const path = require('path');
const jwtUtil = require('../api/v1/helpers/jwtUtil');
const NOT_FOUND = 404;

// protected urls
const viewmap = {
  '/aspects': 'admin/index',
  '/aspects/:key': 'admin/index',
  '/aspects/:key/edit': 'admin/index',
  '/subjects': 'admin/index',
  '/subjects/:key': 'admin/index',
  '/subjects/:key/edit': 'admin/index',
  '/samples': 'admin/index',
  '/samples/:key': 'admin/index',
  '/samples/:key/edit': 'admin/index',
  '/focusGrid': 'focusGrid/focus',
  '/focusRtBracket': 'focusRtBracket/focus',
  '/focusTree': 'focusTree/focus',
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
 * Authentication for validation SAML responses
 * Used in SAML SSO Stategy
 * Will provision user if no matching user is found
 *
 * @param  {Object}   userProfile - User profile parameters
 * @param  {Function} done - Callback function
 */
function samlAuthentication(userProfile, done) {
  User.findOne({ where: { email: userProfile.email } })
  .then((user) => {
    if (!user) {
      return Profile.findOrCreate({ where: { name: 'RefocusSSOUser' } });
    }

    return done(null, user);
  })
  .spread((profile) =>
    User.create({
      email: userProfile.email,
      profileId: profile.id,
      name: userProfile.email,
      password: 'ssopassword',
      sso: true,
    })
  )
  .then((user) => {
    done(null, user);
  })
  .catch((error) => {
    done(error);
  });
}

module.exports = function loadView(app, passport) {
  const keys = Object.keys(viewmap);
  keys.forEach((key) =>
    app.get(
      key,
      ensureAuthenticated,
      (req, res) => {
        // if request admin, serve html file. Otherwise render
        res.render(viewmap[key], {
          trackingId: viewConfig.trackingId,
          user: req.user,
        });
      }
    )
  );

  app.get(
    '/perspectives',
    ensureAuthenticated,
    (req, res) => {
      res.render('perspective/perspective', {
        eventThrottle: viewConfig.realtimeEventThrottleMilliseconds,
        trackingId: viewConfig.trackingId,
      });
    }
  );

  app.get(
    '/perspectives/:key',
    ensureAuthenticated,
    (req, res) => {
      res.render('perspective/perspective', {
        eventThrottle: viewConfig.realtimeEventThrottleMilliseconds,
        trackingId: viewConfig.trackingId,
      });
    }
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
            }, samlAuthentication)
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
            }, samlAuthentication)
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
      const token = jwtUtil.createToken(_req.user);
      _res.cookie('Authorization', token);
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
      res.render('authentication/login/login', {
        trackingId: viewConfig.trackingId,
      });
    }
  );

  // Disable registration when SSO is enabled.
  app.get('/register',
    (req, res, next) => {
      SSOConfig.findOne()
      .then((ssoconfig) => {
        if (ssoconfig) {
          return res.status(NOT_FOUND).send('Page not found');
        }

        return next();
      })
      .catch(() => res.status(NOT_FOUND).send('Page not found'));
    },

    (req, res/* , next*/) => {
      res.render('authentication/register/register', {
        trackingId: viewConfig.trackingId,
      });
    }
  );

  // Redirect '/v1' to '/v1/docs'.
  app.get('/v1', (req, res) => res.redirect('/v1/docs'));
}; // exports
