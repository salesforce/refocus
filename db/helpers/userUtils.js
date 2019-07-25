/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/userUtils.js
 *
 * Used by the User model.
 */
'use strict'; // eslint-disable-line strict

const bcrypt = require('bcrypt-nodejs');
const conf = require('../../config');

/**
 * Creates password hash
 * @param  {Sequelize} seq - A reference to Sequelize to have access to the
 + the Promise class
 * @param  {Text} password - password plain text
 * @returns {Promise}  A promise which resolves to password hash, or rejects if
 *  error is encountered.
 */
function hashPassword(seq, password) {
  return new seq.Promise((resolve, reject) => {
    bcrypt.genSalt(conf.db.passwordHashSaltNumRounds, (err, salt) => {
      if (err) {
        reject(err);
      }

      bcrypt.hash(password, salt, null, (_err, hash) => {
        if (_err) {
          reject(err);
        }

        resolve(hash);
      });
    });
  });
}

module.exports = {
  hashPassword,
};
