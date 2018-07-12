/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/associations.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const testAssociations = require('../common/testAssociations.js').testAssociations;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generators';
const Joi = require('joi');

describe(`tests/api/v1/generators/associations.js, GET ${path} >`, () => {
  let conf = {};

  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const generatorOk = u.getGenerator();
  u.createSGtoSGTMapping(generatorTemplate, generatorOk);
  const generatorInfo = u.getGenerator();
  generatorInfo.name = 'refocus-info-generator';
  u.createSGtoSGTMapping(generatorTemplate, generatorInfo);
  let collector1 = { name: 'hello', version: '1.0.0' };

  before((done) => {
    tu.db.Collector.create(collector1)
    .then((created) => {
      collector1 = created;
      return tu.createUser('assocUser');
    })
    .then((user) => {
      generatorOk.createdBy = user.id;
      generatorInfo.createdBy = user.id;
      conf.token = tu.createTokenFromUserName(user.name);
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(generatorOk))
    .then((gen) => {
      generatorOk.id = gen.id;
      return gen.addPossibleCollectors([collector1]);
    })
    .then(() => Generator.create(generatorInfo))
    .then((gen) => {
      generatorInfo.id = gen.id;
      return gen.addPossibleCollectors([collector1]);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['user', 'possibleCollectors'];
  const schema = {
    user: Joi.object().keys({
      name: Joi.string().required(),
      fullName: Joi.string().optional().allow(null),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        name: Joi.string().required(),
      }).required(),
    }),
    possibleCollectors: Joi.array().length(1).items(
      Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().required(),
        registered: Joi.boolean().required(),
        status: Joi.string().required(),
        isDeleted: Joi.string().required(),
        createdAt: Joi.string().required(),
        updatedAt: Joi.string().required(),
        GeneratorCollectors: Joi.object().required(),
      })),
  };

  testAssociations(path, associations, schema, conf);
});
