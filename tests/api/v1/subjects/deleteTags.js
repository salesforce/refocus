/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/deleteTags.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Subject = tu.db.Subject;
const allDeletePath = '/v1/subjects/{key}/tags';
const oneDeletePath = '/v1/subjects/{key}/tags/{akey}';

describe('tests/api/v1/subjects/deleteTags.js >', () => {
  let token;
  let i;
  const tag0 = 'tag0';

  const n = {
    name: `${tu.namePrefix}NorthAmerica`,
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
    Subject.create(n)
    .then((subj) => {
      i = subj.id;
      done();
    })
    .catch(done);
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('delete all tags', (done) => {
    api.delete(allDeletePath.replace('{key}', i))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(0);
    })
    .end(done);
  });

  it('delete one tag', (done) => {
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', tag0))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);
    })
    .end(done);
  });

  it('delete tag by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'tag0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(1);
      expect(res.body.tags).to.have.members(['tag1']);
    })
    .end(done);
  });

  it('if tag not found; do not delete anything', (done) => {
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.tags).to.have.length(2);
      expect(res.body.tags).to.have.members(['tag1', 'tag0']);
    })
    .end(done);
  });
});
