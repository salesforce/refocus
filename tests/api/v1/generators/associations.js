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
const cu = require('../collectors/utils');
const gu = require('./utils');
const gtUtil = gu.gtUtil;
const constants = require('../../../../api/v1/constants');
const supertest = require('supertest');
const expect = require('chai').expect;
const api = supertest(require('../../../../index').app);
const testAssociations = require('../common/testAssociations.js').testAssociations;
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const CollectorGroup = tu.db.CollectorGroup;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generators';
const Joi = require('joi');

describe(`tests/api/v1/generators/associations.js, GET ${path} >`, () => {
  let conf = {};

  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const generatorOk = gu.getGenerator();
  gu.createSGtoSGTMapping(generatorTemplate, generatorOk);
  const generatorInfo = gu.getGenerator();
  generatorInfo.name = 'refocus-info-generator';
  gu.createSGtoSGTMapping(generatorTemplate, generatorInfo);
  let coll1 = cu.getCollectorToCreate();
  let coll2 = cu.getCollectorToCreate();
  coll1.name += '1';
  coll1.status = 'Running';
  coll1.lastHeartbeat = Date.now();
  coll2.name += '2';
  coll2.status = 'Running';
  coll2.lastHeartbeat = Date.now();
  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  collectorGroup1.collectors = [coll1.name, coll2.name];

  before((done) => {
    Collector.create(coll1)
    .then((created) => {
      coll1 = created;
      return Collector.create(coll2);
    })
    .then((created) => {
      coll2 = created;
      return CollectorGroup.createCollectorGroup(collectorGroup1);
    })
    .then(() =>
      tu.createUser('assocUser')
    )
    .then((user) => {
      generatorOk.createdBy = user.id;
      generatorInfo.createdBy = user.id;
      generatorOk.ownerId = user.id;
      generatorInfo.ownerId = user.id;
      generatorOk.collectorGroup = collectorGroup1.name;
      generatorInfo.collectorGroup = collectorGroup1.name;
      collectorGroup1.createdBy = user.id;
      collectorGroup1.ownerId = user.id;
      conf.token = tu.createTokenFromUserName(user.name);
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.createWithCollectors(generatorOk))
    .then((gen) => {
      generatorOk.id = gen.id;
      return gen.setCurrentCollector(coll1);
    })
    .then(() => Generator.createWithCollectors(generatorInfo))
    .then((gen) => {
      generatorInfo.id = gen.id;
      return gen.setCurrentCollector(coll2);
    })
    .then(() => done())
    .catch(done);
  });

  after(gu.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['user', 'owner', 'currentCollector', 'collectorGroup'];
  const schema = {
    user: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      fullName: Joi.string().optional().allow(null),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().required(),
      }).required(),
    }),
    owner: Joi.object().keys({
      id: Joi.string().required(),
      name: Joi.string().required(),
      fullName: Joi.string().optional().allow(null),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        id: Joi.string().required(),
        name: Joi.string().required(),
      }).required(),
    }),
    currentCollector: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      status: Joi.string().required(),
      lastHeartbeat: Joi.string().required(),
    }),
    collectorGroup: Joi.object().keys({
      id: Joi.string().required(),
      name: Joi.string().required(),
      description: Joi.string().required(),
      collectors: Joi.array().length(2).items(
        Joi.object({
          id: Joi.string().required(),
          name: Joi.string().required(),
          status: Joi.string().required(),
          lastHeartbeat: Joi.string().required(),
        })
      ),
    }),
  };

  testAssociations(path, associations, schema, conf);
});
