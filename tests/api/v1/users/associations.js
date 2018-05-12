/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/associations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const u = require('./utils');
const testAssociations = require('../common/testAssociations.js').testAssociations;
const path = '/v1/users';
const Joi = require('joi');

describe(`tests/api/v1/users/associations.js, GET ${path} >`, () => {
  let conf = {};

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      conf.token = tu.createTokenFromUserName(user.name);
      return tu.createUser('testUser2');
    })
    .then((user) => {
      conf.token2 = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['profile'];
  const schema = {
    profile: Joi.object().keys({
      name: Joi.string(),
    }),
  };

  testAssociations(path, associations, schema, conf);
});
