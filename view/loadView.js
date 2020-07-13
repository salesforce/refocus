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
const ft = require('feature-toggles');
const fs = require('fs');
const { refocusRoomsFeedback } = require('../config');

const redirectFeature = ft.isFeatureEnabled('enableRedirectDifferentInstance');

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
  '/rooms/new/:key': 'rooms/new',
  '/rooms/new/': 'rooms/new',
  '/rooms/:key': 'rooms',
};

const refocusPerspectivesViews = ['/aspects', '/aspects/:key',
  '/aspects/:key/edit', '/subjects', '/subjects/:key',
  '/subjects/:key/edit', '/samples', '/samples/:key',
  '/samples/:key/edit', '/perspectives', '/perspectives/:key'];
 const refocusRoomsViews = ['/rooms', '/rooms/types', '/rooms/types/:key',
  '/rooms/new/:key', '/rooms/new/', '/rooms/:key'];

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
 * Will provision user if no matching user is found.
 * Updates user lastLogin upon successful login.
 *
 * @param  {Object}   userProfile - User profile parameters
 * @param  {Function} done - Callback function
 */
function samlAuthentication(userProfile, done) {
  const userFullName = `${userProfile.firstname} ${userProfile.lastname}`;
  User.findOne({ where: { email: userProfile.email } })
  .then((user) => {
    if (!user) {
      return Profile.findOne({ where: { name: 'RefocusSSOUser' } })
      .then((foundProfile) => {
        if (foundProfile) {
          return foundProfile;
        }

        return Profile.create({ name: 'RefocusSSOUser' });
      })
      .then((profile) => {

        /**
         * default scope not applied on create, so we use User.find after this to
         * get profile attached to user.
         */
        return User.create({
          email: userProfile.email,
          profileId: profile.id,
          name: userProfile.email,
          password: viewConfig.dummySsoPassword,
          fullName: userFullName,
          sso: true,
        });
      })
      .then((createdUser) =>
        User.findByPk(createdUser.id) // to get profile name with user object
      )
      .then((newUser) => {
        done(null, newUser);
      })
      .catch((error) => {
        done(error);
      });
    }

    // profile already attached - default scope applied on find
    if (user.fullName) {
      return user.setLastLogin()
      .then(() => done(null, user));
    }

    // user.fullName doesn't exist, update user
    return user.update({
      fullName: userFullName,
      lastLogin: Date.now(),
    })
    .then(() => done(null, user));
  })
  .catch((error) => done(error));
} // samlAuthentication

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

/**
 * Gets the redirect URI if we should redirect to a different instance of refocus
 * for a view.
 *
 * @param  {String} viewKey - Key of the view being loaded.
 * @param  {String} reqUrl - Url of the request.
 * @returns {String} - Empty string if it should not redirect, otherwise the full
 * uri that should be redirected to.
 */
function getRedirectURI(viewKey, reqUrl) {
  const refocusPerspectivesUrl = process.env.REFOCUS_PERSPECTIVES_BASE_URL;
  const refocusRoomsUrl = process.env.REFOCUS_ROOMS_BASE_URL;
  const shouldRedirectToRooms = refocusRoomsUrl &&
    refocusRoomsViews.includes(viewKey);
  const shouldRedirectToPerspectives = refocusPerspectivesUrl &&
    refocusPerspectivesViews.includes(viewKey);
   if (shouldRedirectToRooms) {
    return refocusRoomsUrl + reqUrl;
  } else if (shouldRedirectToPerspectives) {
    return refocusPerspectivesUrl + reqUrl;
  }
   return '';
} // This function is temporary - remove when separate deployment has settled

function loadView(app, passport) {
  const keys = Object.keys(viewmap);
  keys.forEach((key) =>
    app.get(
      key,
      ensureAuthenticated,
      (req, res) => {
        const copyOfUser = JSON.parse(JSON.stringify(req.user));
        delete copyOfUser.password;
        const trackObj = {
          defaultRoomType: viewConfig.defaultRoomType,
          eventThrottle: viewConfig.realtimeEventThrottleMilliseconds,
          realtimeApplication: viewConfig.realtimeApplication,
          realtimeApplicationImc: viewConfig.realtimeApplicationImc,
          refocusRoomsFeedback,
          roomTypeMapping: viewConfig.roomTypeMapping,
          trackingId: viewConfig.trackingId,
          useNewNamespaceFormat: ft.isFeatureEnabled('useNewNamespaceFormat'),
          useNewNamespaceFormatImc: ft.isFeatureEnabled('useNewNamespaceFormatImc'),
          user: JSON.stringify(copyOfUser).replace(/'/g,"apos;"),
          userSession: req.session.token,
        };

        // This is temporary - remove when separate deployment has settled
        if (redirectFeature) {
          const redirectURI = getRedirectURI(key, req.url);
          if (redirectURI.length) {
            return res.redirect(redirectURI);
          }
        }

        res.render(viewmap[key], trackObj);
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
              cert: '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',
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
}

module.exports = {
  loadView,
  samlAuthentication // for testing
}; // exports
