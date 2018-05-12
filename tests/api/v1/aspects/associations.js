/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/associations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const testAssociations = require('../common/testAssociations.js').testAssociations;
const Aspect = tu.db.Aspect;
const path = '/v1/aspects';
const Joi = require('joi');

describe(`tests/api/v1/aspects/associations.js, GET ${path} >`, () => {
  let conf = {};

  const toCreate = [
    {
      description: 'this is a0 description',
      isPublished: true,
      name: `${tu.namePrefix}a0`,
      timeout: '30s',
    }, {
      description: 'this is a1 description',
      isPublished: false,
      name: `${tu.namePrefix}a1`,
      timeout: '1m',
    },
  ];

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      toCreate.forEach((a) => a.createdBy = user.id);
      conf.token = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.bulkCreate(toCreate)
    .then(() => done())
    .catch(done);
  });

  before(u.populateRedis);

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

