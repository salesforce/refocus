/**
 * api/v1/helpers/verbs/doPost.js
 */
'use strict';

const u = require('./utils');
const httpStatus = require('../../constants').httpStatus;
const logAPI = require('../../../../utils/loggingUtil').logAPI;

/**
 * Creates a new record and sends it back in the json response with status
 * code 201.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to post.
 */
function doPost(req, res, next, props) {
  const toPost = req.swagger.params.queryBody.value;
  const assocToCreate = u.includeAssocToCreate(toPost, props);
  props.model.create(toPost, assocToCreate)
  .then((o) => {
    if (props.loggingEnabled) {
      logAPI(req, props.modelName, o);
    }

    return res.status(httpStatus.CREATED)
    .json(u.responsify(o, props, req.method));
  })
  .catch((err) => u.handleError(next, err, props.modelName));
}

module.exports = doPost;
