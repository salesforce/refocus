/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/common/multipleAssociations.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const Joi = require('joi');
const constants = require('../../../../api/v1/constants');

describe(`tests/api/v1/common/multipleAssociations.js, GET ${'/v1/generators'} >`, () => {
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
        return gen.addCollectors([collector1]);
      })
      .then(() => Generator.create(generatorInfo))
      .then((gen) => {
        generatorInfo.id = gen.id;
        return gen.addCollectors([collector1]);
      })
      .then(() => done())
      .catch(done);
  });

  const schema = {
    user: Joi.object().keys({
      name: Joi.string().required(),
      fullName: Joi.string().optional().allow(null),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        name: Joi.string().required(),
      }).required(),
    }),
    collectors: Joi.array().length(1).items(
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

  after(u.forceDelete);
  after(gtUtil.forceDelete);
  after(tu.forceDeleteUser);

  describe('Checking multiple associations', () => {
    it('find multiple associations can be specified as' +
      ' field params with USER single association', (done) => {
      const fields = ['name', 'user'].toString();
      let path = `${'/v1/generators'}?fields=${fields}`;
      api.get(path)
        .set('Authorization', conf.token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.be.an('array');
          res.body.forEach((record) => {
            associations.forEach((assoc) => {
              expect(record).to.have.property(assoc);
              expect(Joi.validate(record[assoc],
                schema[assoc]).error).to.be.null;
            });
          });
        })
        .end(() => done());
    });

    it('find multiple associations can be specified as' +
      ' field params with COLLECTORS single association', (done) => {
      const fields = ['name', 'collectors'].toString();
      let path = `${'/v1/generators'}?fields=${fields}`;
      api.get(path)
        .set('Authorization', conf.token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.be.an('array');
          res.body.forEach((record) => {
            associations.forEach((assoc) => {
              expect(record).to.have.property(assoc);
              expect(Joi.validate(record[assoc],
                schema[assoc]).error).to.be.null;
            });
          });
        })
        .end(() => done());
    });

    it('find multiple associations can be specified as' +
      ' field params with COLLECTORS and USER', (done) => {
      const fields = ['name', 'collectors', 'user'].toString();
      let path = `${'/v1/generators'}?fields=${fields}`;
      api.get(path)
        .set('Authorization', conf.token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.be.an('array');
          res.body.forEach((record) => {
            associations.forEach((assoc) => {
              expect(record).to.have.property(assoc);
              expect(Joi.validate(record[assoc],
                schema[assoc]).error).to.be.null;
            });
          });
        })
        .end(() => done());
    });

    /*
     * make sure Sequelize generates the same SQL when it has the
     * opposite association (above test).
     */
    it('find multiple associations can be specified as' +
      ' field params with COLLECTORS and USER', (done) => {
      const fields = ['name', 'user', 'collectors'].toString();
      let path = `${'/v1/generators'}?fields=${fields}`;
      api.get(path)
        .set('Authorization', conf.token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body).to.be.an('array');
          res.body.forEach((record) => {
            associations.forEach((assoc) => {
              expect(record).to.have.property(assoc);
              expect(Joi.validate(record[assoc],
                schema[assoc]).error).to.be.null;
            });
          });
        })
        .end(() => done());
    });
  });
});
