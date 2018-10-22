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

  before((done) => {
    Collector.create(coll1)
    .then((created) => {
      coll1 = created;
      return Collector.create(coll2);
    })
    .then((created) => {
      coll2 = created;
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
      return Promise.all([
        gen.setPossibleCollectors([coll1, coll2]),
        gen.setCurrentCollector(coll1),
      ]);
    })
    .then(() => Generator.create(generatorInfo))
    .then((gen) => {
      generatorInfo.id = gen.id;
      return Promise.all([
        gen.setPossibleCollectors([coll1, coll2]),
        gen.setCurrentCollector(coll2),
      ]);
    })
    .then(() => done())
    .catch(done);
  });

  after(gu.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  const associations = ['user', 'currentCollector', 'possibleCollectors'];
  const schema = {
    user: Joi.object({
      name: Joi.string().required(),
      fullName: Joi.string().optional().allow(null),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        name: Joi.string().required(),
      }).required(),
    }),
    currentCollector: Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      status: Joi.string().required(),
      lastHeartbeat: Joi.string().required(),
    }),
    possibleCollectors: Joi.array().length(2).items(
      Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        status: Joi.string().required(),
        lastHeartbeat: Joi.string().required(),
      })
    ),
  };

  testAssociations(path, associations, schema, conf);

  describe('Checking sequelize extra FK when multiple associations', () => {
    it('Extra IDs must be returned from API', (done) => {
      const fields = ['name', ...associations].toString();
      api.get(`${path}?fields=${fields}`)
        .set('Authorization', conf.token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.be.an('array');
          res.body.forEach((record) => {
            associations.forEach((association) => {
              expect(record).to.have.property(association);
              /*
              API is returning extra fields as a solution for Sequelize inner
              query issue that doesn't not return FK when multiple associations.
              */
              expect(record).to.have.property('collectorId');
              expect(record).to.have.property('createdBy');
            });
          });
        })
        .end(done);
    });
  });
});
