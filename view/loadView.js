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
const jwtUtil = require('../utils/jwtUtil');
const httpStatus = require('./constants').httpStatus;
const url = require('url');

// protected urls
const viewmap = {
  '/aspects': 'admin',
  '/aspects/:key': 'admin',
  '/aspects/:key/edit': 'admin',
  '/subjects': 'admin',
  '/subjects/:key': 'admin',
  '/subjects/:key/edit': 'admin',
  '/samples': 'admin',
  '/samples/:key': 'admin',
  '/samples/:key/edit': 'admin',
  '/perspectives': 'perspective/perspective',
  '/perspectives/:key': 'perspective/perspective',
  '/tokens/new': 'tokens/new',
  '/rooms': 'rooms/list',
  '/rooms/types': 'rooms/types',
  '/rooms/types/:key': 'rooms/type',
  '/rooms/:key': 'rooms',
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

    // profile already attached - default scope applied on find
    return done(null, user);
  })
  .spread((profile) =>
    User.create({ // default scope not applied on create, hence no profile
      email: userProfile.email,
      profileId: profile.id,
      name: userProfile.email,
      password: viewConfig.dummySsoPassword,
      sso: true,
    })
  )
  .then((createdUser) =>
    User.findById(createdUser.id) // to get profile name with user object
  )
  .then((user) => {
    done(null, user);
  })
  .catch((error) => {
    done(error);
  });
}

/**
 * Creates redirect url for sso.
 * @param  {String} req Query string
 * @returns {Object} Decode query params object
 */
function getRedirectUrlSSO(req) {
  // req.headers.referer will be the original url requested
  const query = url.parse(req.headers.referer, true).query;

  // default to home page
  let redirectUrl = '/';
  if (query.ru) {
    redirectUrl = query.ru;
  }

  return redirectUrl;
}

module.exports = function loadView(app, passport) {
  const keys = Object.keys(viewmap);
  keys.forEach((key) =>
    app.get(
      key,
      ensureAuthenticated,
      (req, res) => {
        const trackObj = {
          trackingId: viewConfig.trackingId,
          user: JSON.stringify(req.user),
          eventThrottle: viewConfig.realtimeEventThrottleMilliseconds,
          transportProtocol: viewConfig.socketIOtransportProtocol,
        };

        const templateVars = Object.assign(
          {},
          { queryParams: JSON.stringify(req.query) },
          trackObj
        );

        // if url contains a query, render perspective detail page with realtime
        // updates
        if ((key === '/perspectives' && Object.keys(req.query).length) ||
        key === '/perspectives/:key') {
          res.render(viewmap[key], templateVars);
        } else {
          res.render(viewmap[key], trackObj);
        }
      }
    )
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
          const redirectUrl = getRedirectUrlSSO(req);

          // add relay state to remember redirect url when a response is
          // returned from SAML IdP in post /sso/saml route
          passport.use(new SamlStrategy(
            {
              path: '/sso/saml',
              entryPoint: ssoconfig.samlEntryPoint,
              issuer: ssoconfig.samlIssuer,
              additionalParams: { RelayState: redirectUrl },
            }, samlAuthentication)
          );

          return next();
        }

        return res.status(httpStatus.NOT_FOUND).send('Page not found');
      })
      .catch(() => res.status(httpStatus.NOT_FOUND).send('Page not found'));
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

        return res.status(httpStatus.NOT_FOUND).send('Page not found');
      })
      .catch(() => res.status(httpStatus.NOT_FOUND).send('Page not found'));
    },

    passport.authenticate('saml',
      {
        failureRedirect: '/login',
      }),
    (_req, _res) => {
      // We make sure we have _req.user.profile.name in user returned from
      // samlAuthentication
      const user = _req.user;

      return Profile.isAdmin(user.profileId)
      .then((isAdmin) => {
        const payloadObj = {
          ProfileName: user.profile.name,
          IsAdmin: isAdmin,
        };

        if (user && user.name && user.profile && user.profile.name) {
          const token = jwtUtil.createToken(user.name, user.name, payloadObj);
          _req.session.token = token;
        }

        if (_req.body.RelayState) {
          // get the redirect url from relay state if present
          _res.redirect(_req.body.RelayState);
        } else {
          // redirect to home page
          _res.redirect('/');
        }
      });
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
          return res.status(httpStatus.NOT_FOUND).send('Page not found');
        }

        return next();
      })
      .catch(() => res.status(httpStatus.NOT_FOUND).send('Page not found'));
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
