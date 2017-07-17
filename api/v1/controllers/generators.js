/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/generators.js
 */
'use strict'; // eslint-disable-line strict

module.exports = {

  /**
   * DELETE /generators/{key}
   *
   * Deletes the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteGenerator(req, res, next) {
    res.send({status: 200, text: 'Deleted generator'});
  },

  /**
   * GET /generators
   *
   * Finds zero or more generators and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findGenerators(req, res, next) {
    res.send({status: 200, text: 'Get all generators'});
  },

  /**
   * GET /generators/{key}
   *
   * Retrieves the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getGenerator(req, res, next) {
    res.send({status: 200, text: 'Get a generator'});
  },

  /**
   * PATCH /generators/{key}
   *
   * Modifies the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchGenerator(req, res, next) {
    res.send({status: 200, text: 'PATCH a generator'});
  },

  /**
   * POST /generators/{key}
   *
   * Modifies the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postGenerator(req, res, next) {
    res.send({status: 201, text: 'POST a generator'});
  },

  /**
   * PUT /generators/{key}
   *
   * Modifies the generator and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putGenerator(req, res, next) {
    res.send({status: 200, text: 'PUT a generator'});
  },
}; // exports
