/**
 * api/v1/helpers/verbs/doPatch.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;

/**
 * Updates a record and sends the udpated record back in the json response
 * with status code 200.
 *
 * PATCH will only update the attributes provided in the body of the request.
 * Other attributes will not be updated.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to patch.
 */
function doPatch(req, res, next, props) {
  const requestBody = req.swagger.params.queryBody.value;
  u.findByKey(props, req.swagger.params)
  .then((o) => {
    // To avoid timeouts when patching samples; force the update, even if
    // the value has not changed. Adding this to the "before update hook" does
    // give the needed effect; so adding it here!!!.
    if (props.modelName === 'Sample') {
      o.changed('value', true);
    }

    u.patchJsonArrayFields(o, requestBody, props);
    return o.update(requestBody);
  })
  .then((o) => u.handleAssociations(requestBody, o, props, req.method))
  .then((retVal) =>
    res.status(httpStatus.OK).json(u.responsify(retVal, props, req.method)))
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPatch;
