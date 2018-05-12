/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/associations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const testAssociations = require('../common/testAssociations.js').testAssociations;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generatorTemplates';
const Joi = require('joi');

describe(`tests/api/v1/generatorTemplates/associations.js, GET ${path} >`, () => {
  let conf = {};

  const template1 = u.getGeneratorTemplate();
  template1.name = 'template1';
  const template2 = u.getGeneratorTemplate();
  template2.name = 'template2';

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      template1.createdBy = user.id;
      template2.createdBy = user.id;
      conf.token = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(template1)
    .then(() => GeneratorTemplate.create(template2))
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

