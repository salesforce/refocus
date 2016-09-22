/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/deleteAssociations.js
 */
'use strict'; // eslint-disable-line strict

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const apiErrors = require('../../apiErrors');
const logAPI = require('../../../../utils/loggingUtil').logAPI;

/**
 * Deletes association from the object and sends updated object in the
 * response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to delete.
 */
function deleteAssociations(req, res, next, props) {
  const association = props.association;
  const getAssocfuncName = `get${u.capitalizeFirstLetter(association)}`;
  let objId;
  let resObj;
  const params = req.swagger.params;

  // find main object
  u.findByKey(props, params)
  .then((obj) => {
    objId = obj.id;

    // get specific association by id or name
    if (params.akey) {
      if (u.looksLikeId(params.akey.value)) {
        return obj[getAssocfuncName]({ where: { id: params.akey.value } });
      }

      return obj[getAssocfuncName]({ where: { name: params.akey.value } });
    }

    // get all association
    return obj[getAssocfuncName]();
  })
  .then((assocObj) => {
    if (assocObj.length > 0) {
      const promises = assocObj.map((obj) => obj.destroy());
      return Promise.all(promises);
    }

    if (params.akey) {
      const err = new apiErrors.ResourceNotFoundError();
      err.resource = association;
      err.key = params.akey.value;
      throw err;
    }
  })
  .then(() => props.model.findOne({ where: { id: objId } }))
  .then((returnedObj) => {
    resObj = returnedObj;
    return returnedObj[getAssocfuncName]();
  })
  .then((assocObj) => {
    resObj.dataValues[association] = assocObj;

    if (props.loggingEnabled) {
      const logAssociationInfo = { association };
      if (params.akey) {
        logAssociationInfo.key = params.akey.value;
      }

      logAPI(req, props.modelName, resObj, logAssociationInfo);
    }

    res.status(httpStatus.OK).json(
      u.responsify(resObj, props, req.method)
    );
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = deleteAssociations;
