/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./realTime/setupSocketIO.js
 *
 * Initialize socket.io for sending realtime events out to perspective pages.
 */
'use strict'; // eslint-disable-line strict
const ResourceNotFoundError = require('../db/dbErrors').ResourceNotFoundError;
const perspective = require('../db/index').Perspective;
const room = require('../db/index').Room;
const featureToggles = require('feature-toggles');
const rtUtils = require('./utils');
const jwtUtils = require('../utils/jwtUtil');
const redisClient = require('../cache/redisCache').client.realtimeLogging;
const conf = require('../config');
const ipWhitelist = conf.environment[conf.nodeEnv].ipWhitelist;
const activityLogUtil = require('../utils/activityLog');
const logEnabled =
  featureToggles.isFeatureEnabled('enableRealtimeActivityLogs');
const ONE = 1;
const SID_REX = /connect.sid=s%3A([^\.]*)\./;

/**
 * Load the authenticated user name from the session id.
 *
 * @param {String} sid - The session id from the cookie
 * @param {Object} redisStore - The RedisStore object
 * @param {String} username
 * @throws {Error} missing session or user name
 */
function getUserFromSession(sid, redisStore) {
  return new Promise((resolve, reject) => {
    redisStore.get(sid, (err, sessionData) => {
      if (err) {
        reject(err);
      } else if (sessionData && sessionData.passport &&
      sessionData.passport.user && sessionData.passport.user.name) {
        resolve(sessionData.passport.user.name);
      } else {
        reject(new Error('Expecting valid session'));
      }
    });
  });
} // getUserFromSession

/**
 * Fetches all the perspectives and calls initializeNamespace to initialize
 * a socketIO namespace for each one.
 *
 * @param {Socket.io} io - The socket.io server-side object.
 * @returns {Promise} - Returns a promise that resolves to the socket.io
 *  server-side object with the namespace initialized.
 */
function setupNamespace(io) {
  return new Promise((resolve, reject) => {
    perspective.findAll()
    .then((objArr) => {
      if (objArr) {
        objArr.forEach((o) => rtUtils.initializePerspectiveNamespace(o, io));
      }
    })
    .then(() => room.findAll()
      .then((rooms) => {
        if (rooms) {
          rooms.forEach((r) => rtUtils.initializeBotNamespace(r.toJSON(), io));
          resolve(io);
        }
      })
    )
    .catch(reject);
  });
} // setupNamespace

/**
 * Set up a namespace for each perspective. On socket connect, start tracking
 * information about the socket for realtime activity logging. On socket
 * disconnect, write out the activity log.
 *
 * @param {Socket.io} io - socket.io's server-side object
 * @returns {Promise} - Returns a promise that resolves to the socket.io
 *  server-side object with the namespace initialized. (This is returned for
 *  testability.)
 */
function init(io, redisStore) {
  io.sockets.on('connection', (socket) => {
    // check if connection has a "cookie" for authentication
    if (socket.handshake.headers.cookie) {
      // Pull the sesssion id off the cookie.
      const sidMatch = SID_REX.exec(socket.handshake.headers.cookie);
      if (!sidMatch || sidMatch.length < 2) {
        // disconnecting socket -- expecting session id in cookie header
        // console.log('[WSDEBUG] disconnecting socket -- expecting session ' +
        //   'id in cookie header');
        socket.disconnect();
        return;
      }

      // Load the session from redisStore.
      const sid = sidMatch[1];

      // console.log('[WSDEBUG] cookie', socket.handshake.headers.cookie);
      // console.log('[WSDEBUG] sid', sid);
      getUserFromSession(sid, redisStore)
      .then((user) => {

        // OK, we've got a user from the session!
        let ipAddress;

        // Get IP address and perspective name from socket handshake.
        if (socket.handshake) {
          if (socket.handshake.headers &&
          socket.handshake.headers['x-forwarded-for']) {
            ipAddress = socket.handshake.headers['x-forwarded-for'];

            // console.log('[IPDEBUG] socket.handshake.headers' +
            //   '[x-forwarded-for]', ipAddress);
          } else if (socket.handshake.address) {
            // console.log('[IPDEBUG] socket.handshake.address', ipAddress);
            ipAddress = socket.handshake.address;
          }

          rtUtils.isIpWhitelisted(ipAddress, ipWhitelist); // throws error
        } else {
          throw new Error('disconnecting socket: could not identify ip address');
        }

        if (logEnabled) {
          const toLog = {
            ipAddress,
            starttime: Date.now(),
            user: user,
          };

          if (socket.handshake.query && socket.handshake.query.p) {
            toLog.perspective = socket.handshake.query.p;
          }

          redisClient.set(socket.id, JSON.stringify(toLog));

          socket.on('disconnect', () => {
            // Retrieve the logging info for this socket.
            redisClient.get(socket.id, (getErr, getResp) => {
              if (getErr) {
                console.log('Error ' + // eslint-disable-line no-console
                  `retrieving socket id ${socket.id} from redis on client ` +
                  'disconnect:', getErr);
              } else { // eslint-disable-line lines-around-comment
                /*
                 * Calculate the totalTime and write out the log line. If redis
                 * was flushed by an admin, the response here will be empty, so
                 * just skip the logging.
                 */
                const d = JSON.parse(getResp);
                if (d && d.starttime) {
                  d.totalTime = (Date.now() - d.starttime) + 'ms';
                  activityLogUtil.printActivityLogString(d, 'realtime');
                }

                // Remove the redis key for this socket.
                redisClient.del(socket.id, (delErr, delResp) => {
                  if (delErr) {
                    console.log('Error ' + // eslint-disable-line no-console
                      `deleting socket id ${socket.id} from redis on ` +
                      'client disconnect:', delErr);
                  } else if (delResp !== ONE) {
                    console.log('Expecting' + // eslint-disable-line no-console
                      `unique socket id ${socket.id} to delete from redis on ` +
                      `client disconnect, but ${delResp} were deleted.`);
                  }
                }); // redisClient.del
              }
            }); // redisClient.get
          }); // on disconnect
        } // if logEnabled
      })
      .catch((err) => {
        // no realtime events :(
        // console.log('[WSDEBUG] caught error', err);
        socket.disconnect();
        return;
      });

    // check if connection using an authorization header
    } else if (socket.handshake.headers.authorization) {
      const token = socket.handshake.headers.authorization;

      jwtUtils.verifyBotToken(token)
      .then((check) => {
        if (!check) {
          socket.disconnect();
          return;
        }
      });
    } else {
      // Socket handshake must have "cookie" or an "auth" header with connect.sid.
      // disconnecting socket -- expecting header with cookie or auth token
      // console.log('[WSDEBUG] disconnecting socket -- expecting header ' +
      //   'with cookie');
      socket.disconnect();
      return;
    } // no cookie
  }); // on connect

  return setupNamespace(io); // executes only on server start
} // init

module.exports = {
  init,
};
