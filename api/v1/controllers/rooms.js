/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/users.js
 */
'use strict';

const httpStatus = require('../constants').httpStatus;

module.exports = {
  findRooms(req, res, next) {
    return res.status(httpStatus.OK).json({
      success: true
    });
  },
}