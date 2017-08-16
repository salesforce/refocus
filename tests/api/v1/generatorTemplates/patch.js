/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generatorTemplates/patch.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const path = '/v1/generatorTemplates';
const expect = require('chai').expect;

describe('tests/api/v1/generatorTemplates/patch.js > ', () => {
  const generatorTemplateToCreate = u.getGeneratorTemplate();
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    GeneratorTemplate.create(generatorTemplateToCreate)
    .then((gen) => {
      i = gen.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('simple patching: ok', (done) => {
    const newName = {
      name: 'template1',
    };
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send(newName)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.name).to.equal(newName.name);
    })
    .end(done);
  });

  it('simple patching using name in the url: ok', (done) => {
    const newName = {
      name: 'template1',
    };
    api.patch(`${path}/${generatorTemplateToCreate.name}`)
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
      contextDefiniton: {
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
      expect(res.body.contexDefinition).to.deep.equal(toPatch.context);
    })
    .end(done);
  });

  it('switch isPublished from true to false', (done) => {
    api.patch(`${path}/${i}`)
    .set('Authorization', token)
    .send({ isPublished: false })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.isPublished).to.equal(false);
    })
    .end(done);
  });
});
