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
  let i = 0;
  const sgt = u.getGeneratorTemplate();
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(sgt)
    .then((gen) => {
      i = gen.id;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('patch anything other than isPublished should fail', (done) => {
    api.patch(`${path}/${sgt.name}`)
    .set('Authorization', token)
    .send({
      name: 'template1',
      isPublished: true,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect((res) => {
      expect(res.body.errors[0])
      .to.have.property('type', 'ValidationError');
    })
    .end(done);
  });

  it('patch isPublished ok', (done) => {
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
