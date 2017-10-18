/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/getHierarchyWithoutSamples.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const samstoinit = require('../../../../cache/sampleStoreInit');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';
const expect = require('chai').expect;

describe('tests/cache/models/subjects/getHierarchyWithoutSamples.js, ' +
`api: GET ${path} >`, () => {
  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };
  const aspect = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    rank: 10,
  };
  let token;
  let ipar = 0;
  let ichi = 0;
  let igrn = 0;

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
    })
    .then(() => {
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    })
    .then((sub) => {
      igrn = sub.id;
      return tu.db.Aspect.create(aspect);
    })
    .then(() => samstoinit.populate())
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(rtu.forceDeleteUserAndProf);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('subject hierarchy without samples >', () => {
    it('hierarchy should load from the parent node', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.be.empty;
      })
      .end(done);
    });

    it('hierarchy should load from grand child node', (done) => {
      api.get(path.replace('{key}', igrn))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.be.empty;
      })
      .end(done);
    });

    it('hierarchy should load from child node', (done) => {
      api.get(path.replace('{key}', ichi))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.be.empty;
      })
      .end(done);
    });
  });
});
