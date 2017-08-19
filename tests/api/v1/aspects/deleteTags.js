/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/deleteTags.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const allDeletePath = '/v1/aspects/{key}/tags';
const oneDeletePath = '/v1/aspects/{key}/tags/{akey}';

describe('tests/api/v1/aspects/deleteTags.js >', () => {
  let token;
  let aspId;
  const tag0 = 'tag0';

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    tags: ['tag0', 'tag1'],
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Aspect.create(n)
    .then((asp) => {
      aspId = asp.id;
      done();
    })
    .catch(done);
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete all tags', (done) => {
    api.delete(allDeletePath.replace('{key}', aspId))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(0);
    })
    .end(done);
  });

  it('delete one tag', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', tag0))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);
    })
    .end(done);
  });

  it('delete tag by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', tag0))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);
    })
    .end(done);
  });

  it('error if tag not found', (done) => {
    api.delete(oneDeletePath.replace('{key}', aspId).replace('{akey}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(2);
      expect(res.body.tags).to.have.members(['tag1', 'tag0']);
    })
    .end(done);
  });
});
