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
const jwtUtil = require('../utils/jwtUtil');
const rtUtils = require('./utils');
const redisClient = require('../cache/redisCache').client.realtimeLogging;
const activityLogUtil = require('../utils/activityLog');
const featureToggles = require('feature-toggles');
const logEnabled =
  featureToggles.isFeatureEnabled('enableRealtimeActivityLogs');
const ZERO = 0;
const ONE = 1;

/**
 * Extract the token info from the socket.
 *
 * @param {Socket} socket - The socket.
 * @returns {Promise} - Resolves to object with "username" and "tokenname"
 *  attributes.
 */
function extractTokenInfo(socket) {
  const resp = { username: '', tokenname: '' };
  return new Promise((resolve) => {
    try {
      const token = socket.handshake.headers.cookie.split('; ')
        .filter((c) => c.startsWith('Authorization='))[ZERO]
        .split('=')[ONE];
      if (token) {
        jwtUtil.getTokenDetailsFromTokenString(token)
        .then(resolve)
        .catch(() => {
          // Write out log with empty username/tokenname if not available
          resolve(resp);
        });
      } else { // No token, just write out log with empty username/tokenname
        resolve(resp);
      }
    } catch (err) {
      // Socket doesn't contain expected handshake.headers.cookie.
      resolve(resp); // Write out log with empty username/tokenname
    }
  });
} // extractTokenInfo

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
        objArr.forEach((o) => rtUtils.initializeNamespace(o, io));
        resolve(io);
      } else {
        const err = new ResourceNotFoundError();
        err.resourceType = 'Perspective';
        throw err;
      }
    })
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
function init(io) {
  io.sockets.on('connection', (socket) => {
    if (logEnabled) {
      const toLog = {
        starttime: Date.now(),
      };
      if (socket.handshake) {
        if (socket.handshake.headers &&
          socket.handshake.headers['x-forwarded-for']) {
          toLog.ipAddress = socket.handshake.headers['x-forwarded-for'];
        } else if (socket.handshake.address) {
          toLog.ipAddress = socket.handshake.address;
        }

        if (socket.handshake.query && socket.handshake.query.p) {
          toLog.perspective = socket.handshake.query.p;
        }
      }

      extractTokenInfo(socket)
      .then((resp) => {
        if (resp.username) {
          toLog.user = resp.username;
        }

        if (resp.tokenname) {
          toLog.token = resp.tokenname;
        }

        // Store the logging info in redis keyed off the socket id.
        redisClient.set(socket.id, JSON.stringify(toLog));
      });
    } // if logEnabled

    if (logEnabled) {
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
  }); // on connect
  return setupNamespace(io);
} // init

module.exports = {
  init,
};
