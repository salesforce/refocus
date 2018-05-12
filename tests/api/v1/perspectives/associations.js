/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/associations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const testAssociations = require('../common/testAssociations.js').testAssociations;
const Perspective = tu.db.Perspective;
const path = '/v1/perspectives';
const Joi = require('joi');

describe(`tests/api/v1/perspectives/associations.js, GET ${path} >`, () => {
  let conf = {};

  const persp1 = {
    name: `${tu.namePrefix}persp1`,
    rootSubject: 'myMainSubject',
    aspectFilter: ['temperature', 'humidity'],
    aspectTagFilter: ['temp', 'hum'],
    subjectTagFilter: ['ea', 'na'],
    statusFilter: ['Critical', '-OK'],
  };

  const persp2 = {
    name: `${tu.namePrefix}persp2`,
    rootSubject: 'myMainSubject',
    aspectFilter: ['temperature', 'humidity'],
    aspectTagFilter: ['temp', 'hum'],
    subjectTagFilter: ['ea', 'na'],
    statusFilter: ['Critical', '-OK'],
  };

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      persp1.createdBy = user.id;
      persp2.createdBy = user.id;
      conf.token = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((createdLens) => {
      persp1.lensId = createdLens.id;
      persp2.lensId = createdLens.id;
      return Perspective.create(persp1);
    })
    .then(() => Perspective.create(persp2))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['user', 'lens'];
  const schema = {
    user: Joi.object().keys({
      name: Joi.string(),
      email: Joi.string(),
      profile: Joi.object().keys({
        name: Joi.string(),
      }),
    }),
    lens: Joi.object().keys({
      id: Joi.string(),
      name: Joi.string(),
    }),
  };

  testAssociations(path, associations, schema, conf);
});
