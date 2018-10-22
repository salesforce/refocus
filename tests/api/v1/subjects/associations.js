/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/associations.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const testAssociations = require('../common/testAssociations.js').testAssociations;
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const Joi = require('joi');

describe(`tests/api/v1/subjects/associations.js, GET ${path} >`, () => {
  let conf = {};

  const na = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
    sortBy: '_1',
  };
  const us = {
    name: `${tu.namePrefix}UnitedStates`,
    description: 'country',
    tags: ['US'],
    sortBy: '_a',
  };

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      na.createdBy = user.id;
      us.createdBy = user.id;
      conf.token = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(na)
    .then(() => Subject.create(us))
    .then(() => done())
    .catch(done);
  });

  before(u.populateRedis);
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['user'];
  const schema = {
    user: Joi.object().keys({
      name: Joi.string().required(),
      fullName: Joi.string().optional().allow(null),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        name: Joi.string().required(),
      }).required(),
    }),
  };

  testAssociations(path, associations, schema, conf);
});
