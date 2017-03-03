/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/getHierarchy.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const samstoinit = require('../../../../cache/sampleStoreInit');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';
const expect = require('chai').expect;

describe(`api: GET ${path}`, () => {
  let token;

  const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };

  const aspect = {
    name: 'temperature',
    timeout: '30s',
    isPublished: true,
    rank: 10,
  };

  const sample1 = { value: '10' };

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
      sample1.subjectId = sub.id;
      igrn = sub.id;
      return tu.db.Aspect.create(aspect);
    })
    .then((a) => {
      sample1.aspectId = a.id;
      return tu.db.Sample.create(sample1);
    })
    .then((samp) => {
      sample1.id = samp.id;
      return samstoinit.init();
    })
    .then(() => done())
    .catch(done);
  });

  after(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  describe('subject hierarchy with samples', () => {
    it('should be an empty object at the parent level', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.be.empty;
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it('should be a non empty object at the grandchild level', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children[0].children[0].samples).to.be
          .an('array');
        expect(res.body.children[0].children[0].samples).to.not
          .empty;
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });

    it.skip('aspect rank must be included in the hierarchy', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.children[0].children[0].samples).to.be
          .an('array');
        console.log(res.body);
        expect(res.body.children[0].children[0].samples).to.have.lengthOf(1);
        expect(res.body.children[0].children[0].samples[0].aspect.rank).
          to.equal(10);
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        // done();
      });
    });

    it('should be a non empty object at the 1st  of grandchild', (done) => {
      api.get(path.replace('{key}', igrn))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .expect((res) => {
        expect(res.body.samples).to.be.an('array');
        expect(res.body.samples).to.not.empty;
      })
      .end((err /* , res */) => {
        if (err) {
          done(err);
        }

        done();
      });
    });
  });

  it('by id', (done) => {
    api.get(path.replace('{key}', ipar))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      // parent level
      expect(res.body.samples).to.be.an('array');
      expect(res.body.children).to.have.length(res.body.childCount);

      // child level
      expect(res.body.children[0].samples).to.be.an('array');
      expect(res.body.children[0].children).to.be.an('array');
      expect(res.body.children[0].children).to.have
        .length(res.body.children[0].childCount);
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('by abs path', (done) => {
    api.get(path.replace('{key}', par.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      // parent level
      expect(res.body.samples).to.be.an('array');
      expect(res.body.children).to.have.length(res.body.childCount);

      // child level
      expect(res.body.children[0].samples).to.be.an('array');
      expect(res.body.children[0].children).to.be.an('array');
      expect(res.body.children[0].children).to.have
        .length(res.body.children[0].childCount);
    })
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
});
