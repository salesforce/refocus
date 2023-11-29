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
const SamlStrategy = require('@node-saml/passport-saml').Strategy;
const viewConfig = require('../viewConfig');
const jwtUtil = require('../utils/jwtUtil');
const httpStatus = require('./constants').httpStatus;
const url = require('url');
const ft = require('feature-toggles');
const { refocusRoomsFeedback, ssoCert, pagerDuty } = require('../config');

const redirectFeature = ft.isFeatureEnabled('enableRedirectDifferentInstance');

console.log('user', User);
console.log('Profile', Profile);
console.log('SSOConfig $$$$$$$$', SSOConfig);
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
  console.log('\n\n\n ensureAuthenticated $$$$$$$$$$$$$');
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
  console.log('\n\n\n samlAuthentication $$$$$');
  debugger
  const userFullName = `${userProfile.firstname} ${userProfile.lastname}`;
  console.log('\n\n userFullName $$$$$$$$$$$$', userFullName);
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
  console.log('\n\n\ loadView $$$$$$$$$$$$$$$$$');
  const keys = Object.keys(viewmap);
  console.log('\n\n keys $$$$$$$$', keys);
  keys.forEach((key) =>
    app.get(
      key,
      ensureAuthenticated,
      (req, res) => {
        console.log(`\n\n Route accessed: ((((())(((((((())))))))))) ${req.method} ${req.originalUrl}`);
        const copyOfUser = JSON.parse(JSON.stringify(req.user));
        delete copyOfUser.password;
        const trackObj = {
          defaultRoomType: viewConfig.defaultRoomType,
          eventThrottle: viewConfig.realtimeEventThrottleMilliseconds,
          realtimeApplication: viewConfig.realtimeApplication,
          realtimeApplicationImc: viewConfig.realtimeApplicationImc,
          refocusRoomsFeedback,
          pagerDuty,
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
  console.log('before setting app routes here $$$$', process.env);
  app.get('/loginSAML',
    (req, res, next) => {
      console.log('here before SSOCONFIG \n\n');
      SSOConfig.findOne()
      .then((ssoconfig) => {
        if (ssoconfig) {
          const redirectUrl = getRedirectUrlSSO(req);

          /* add relay state to remember redirect url when a response is
             returned from SAML IdP in post /sso/saml route */
          const sso = {
            path: '/sso/saml',
            entryPoint: ssoconfig.samlEntryPoint,
            issuer: ssoconfig.samlIssuer,
            additionalParams: { RelayState: redirectUrl },
          };

          // https://github.com/bergie/passport-saml#security-and-signatures
          if (ssoCert) sso.cert = ssoCert;
          passport.use(new SamlStrategy(sso, samlAuthentication));
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
          const sso = {
            path: '/sso/saml',
            entryPoint: ssoconfig.samlEntryPoint,
            issuer: ssoconfig.samlIssuer,
          };

          // https://github.com/bergie/passport-saml#security-and-signatures
          if (ssoCert) sso.cert = ssoCert;
          passport.use(new SamlStrategy(sso, samlAuthentication));
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
      console.log('\n\n login $$$$$$$$$$$');
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
