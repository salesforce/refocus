/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generator/patch.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generators';
const expect = require('chai').expect;

describe('tests/api/v1/generators/patch.js >', () => {
  let i = 0;
  let token;
  const generatorToCreate = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  u.createSGtoSGTMapping(generatorTemplate, generatorToCreate);

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Generator.create(generatorToCreate))
    .then((gen) => {
      i = gen.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(gtUtil.forceDelete);

  it('simple patching: ok', (done) => {
    const newDescription = {
      description: 'Smiple patching test of generator',
    };
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(newDescription)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.description).to.equal(newDescription.description);
    })
    .end(done);
  });

  it('simple patching using name in the url: ok', (done) => {
    const newName = {
      name: 'New_Name',
    };
    api.patch(`${path}/${generatorToCreate.name}`)
    .set('Authorization', token)
    .send(newName)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.name).to.equal(newName.name);
    })
    .end(done);
  });

  it('patch complex json schema', (done) => {
    const toPatch = {
      context: {
        okValue: {
          required: true,
          default: '1',
          description: 'An ok sample\'s value, e.g. \'0\'',
        },
        criticalValue: {
          required: true,
          default: '2',
          description: 'A critical sample\'s value, e.g. \'1\'',
        },
      },
    };
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(toPatch)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.context).to.deep.equal(toPatch.context);
    })
    .end(done);
  });

  it('switch isActive from false to true', (done) => {
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send({ isActive: true })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.isActive).to.equal(true);
    })
    .end(done);
  });
});
