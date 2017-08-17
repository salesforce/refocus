/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/deleteHierarchy.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';

describe(`tests/api/v1/subjects/deleteHierarchy.js, DELETE ${path} >`, () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };
  let ipar = 0;
  let ichi = 0;
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
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('by id', (done) => {
    api.delete(path.replace('{key}', ipar))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('by abs path', (done) => {
    const pth = path.replace('{key}', `${tu.namePrefix}NorthAmerica`);
    api.delete(pth)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end(done);
  });

  it('by abs path, not found', (done) => {
    api.delete(path.replace('{key}', 'x'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });
});
