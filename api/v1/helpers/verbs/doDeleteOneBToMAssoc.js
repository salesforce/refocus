/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doDeleteOneBToMAssoc.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;

/**
 * Deletes the associated record of the model which is identified by the
 * association name or id.
 *
 * @param {IncomingMessage} req - The request object`
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the resource
 * whose association has to be deleted
 * @param {String} assocName - The name of the association associated with the
 * model
 * @param {String} nameOrId - The name or id of the association to be deleted
 *
 */
function doDeleteOneBtoMAssoc(req, res, next, // eslint-disable-line max-params
              props, assocName, nameOrId) {
  const params = req.swagger.params;
  const options = {};
  options.where = u.whereClauseForNameOrId(nameOrId);
  let modelInst;
  u.findByKey(props, params)
  .then((o) => {
    modelInst = o;
    return u.isWritable(req, o);
  })
  .then((ok) => {
    if (ok) {

      // if assocName is "writers", it resolves to "getWriters"
      const getAssocfuncName = `get${u.capitalizeFirstLetter(assocName)}`;
      return modelInst[getAssocfuncName](options);
    }

    return u.forbidden(next);
  })
  .then((_o) => {
    if (_o) {

      // if the resolved object is an empty array, throw a ResourceNotFound error
      u.throwErrorForEmptyArray(_o,
          params.userNameOrId.value, assocName);

      // if assocName is "writers", it resolves to "removeWriters"
      const functionName = `remove${u.capitalizeFirstLetter(assocName)}`;

      /*
       * if the assocName is "writers", it resolves to
       * modelInst.removeWriters(_o)
       */
      modelInst[functionName](_o);
      res.status(httpStatus.NO_CONTENT).json();
    }
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doDeleteOneBtoMAssoc;
