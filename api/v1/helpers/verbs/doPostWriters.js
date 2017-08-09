/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doPostWriters.js
 */
'use strict'; // eslint-disable-line strict
const doPostAssoc = require('./doPostBToMAssoc');
const u = require('./utils');
const userProps = require('../nouns/users');

/**
 * Add writers (user association) to the model.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type.
 */
function doPostWriters(req, res, next, props) {
  const params = req.swagger.params;
  const toPost = params.queryBody.value;
  const options = {};
  options.where = u.whereClauseForNameInArr(toPost);
  userProps.model.findAll(options)
  .then((usrs) =>
    doPostAssoc(req, res, next, props, props.belongsToManyAssoc.users, usrs))
  .catch((err) => u.handleError(next, err, props.modelName));
} // doPostWriters

module.exports = doPostWriters;
