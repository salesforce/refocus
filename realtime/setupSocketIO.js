/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./realTime/setupSocketIO.js
 */

'use strict'; // eslint-disable-line strict
const ResourceNotFoundError = require('../db/dbErrors.js')
                                    .ResourceNotFoundError;
const perspective = require('../db/index').Perspective;

const rtUtils = require('./utils.js');

/**
 *
 * Fetches all the perspectives defined in the prespective table and calls
 * the initializeNamespace function to initialize the socketIO namespace
 * @param {Socket.io} io - The socketio's server side object
 * @returns {Promise} - Returns a promise that resolves to socket io object with
 * the namespace initialized.
 */
function setupNamespace(io) {
  return new Promise((resolve, reject) => {
    perspective.findAll()
    .then((objArr) => {
      if (objArr) {
        objArr.forEach((o) => {
          rtUtils.initializeNamespace(o, io);
        });
        resolve(io);
      } else {
        const err = new ResourceNotFoundError();
        err.resourceType = 'Perspective';
        throw err;
      }
    })
    .catch((err) => reject(err));
  });
}

module.exports = {

  setupNamespace,

};
