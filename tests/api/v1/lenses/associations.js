/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/associations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const testAssociations = require('../common/testAssociations.js').testAssociations;
const Lens = tu.db.Lens;
const path = '/v1/lenses';
const Joi = require('joi');

describe(`tests/api/v1/lenses/associations.js, GET ${path} >`, () => {
  let conf = {};

  const lens1 = u.getLens();
  const lens2 = u.getLens();
  lens1.name = 'lens1';
  lens2.name = 'lens2';

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      lens1.installedBy = user.id;
      lens2.installedBy = user.id;
      conf.token = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  before((done) => {
    Lens.create(lens1)
    .then(() => Lens.create(lens2))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['user'];
  const schema = {
    user: Joi.object().keys({
      name: Joi.string(),
      email: Joi.string(),
      profile: Joi.object().keys({
        name: Joi.string(),
      }),
    }),
  };

  testAssociations(path, associations, schema, conf);
});
