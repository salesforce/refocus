/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doPostBToMAssoc.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;

/**
 * Creates a one to many association between a instance of the model name
 * identified by "props.Name" and the instances of the model in assocArray. The
 * association is defined through "assocName"
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the resource
 * whose association has to be deleted
 * @param {String} assocName - The name of the association associated with the
 * model
 * @param {Array} assocArray - The instances of a model for which the
 * association has to be created.
 */
function doPostBToMAssoc(req, res, next, // eslint-disable-line max-params
              props, assocName, assocArray) {
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  u.findByKey(props, params)
  .then((o) => u.isWritable(req, o))
  .then((o) => {
    const addAssocfuncName = `add${u.capitalizeFirstLetter(assocName)}`;
    return o[addAssocfuncName](assocArray);
  })
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;

    /*
     * The resolved object is either an array of arrays (when
     * writers are added) or just an empty array when no writers are added.
     * The popping is done to get the array from the array of arrays
     */
    let retval = o.length ? o.pop() : o;
    retval = u.responsify(retval, props, req.method);
    u.logAPI(req, resultObj, retval);
    res.status(httpStatus.CREATED).json(retval);
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPostBToMAssoc;
