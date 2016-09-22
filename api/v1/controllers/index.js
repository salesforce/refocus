/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/index.js
 */
'use strict';

module.exports = {

  /**
   * GET /
   *
   * Iterates over all the configured paths to get a listing of the API
   * endpoints using the descriptions from the swagger file.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  get(req, res, next) {
    const apiLinksJson = {};
    const keys = Object.keys(req.swagger.swaggerObject.paths);
    for (let i = 0; i < keys.length; i++) {
      const pathKey = keys[i];
      const path = req.swagger.swaggerObject.paths[pathKey];
      apiLinksJson[pathKey] = {};
      if (path.delete) {
        apiLinksJson[pathKey].DELETE = path.delete.description;
      }

      if (path.get) {
        apiLinksJson[pathKey].GET = path.get.description;
      }

      if (path.patch) {
        apiLinksJson[pathKey].PATCH = path.patch.description;
      }

      if (path.post) {
        apiLinksJson[pathKey].POST = path.post.description;
      }

      if (path.put) {
        apiLinksJson[pathKey].PUT = path.put.description;
      }
    }

    res.json(apiLinksJson);
  },
}; // exports
