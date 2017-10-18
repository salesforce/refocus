/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/aspects/deleteRelatedLinks.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const allDeletePath = '/v1/aspects/{key}/relatedLinks';
const oneDeletePath = '/v1/aspects/{key}/relatedLinks/{akey}';
const redisOps = require('../../../../cache/redisOps');
const objectType = require('../../../../cache/sampleStore')
  .constants.objectType;
const samstoinit = rtu.samstoinit;
const ZERO = 0;
const ONE = 1;

describe('tests/cache/models/aspects/deleteRelatedLinks.js >', () => {
  let token;
  let i;
  let name;

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
    relatedLinks: [
      { name: 'rlink0', url: 'https://samples.com' },
      { name: 'rlink1', url: 'https://samples.com' },
    ],
    isPublished: true,
  };

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
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
      i = asp.id;
      name = asp.name;
      return samstoinit.eradicate();
    })
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('time fields have the expected format, after delete all related links',
    (done) => {
    api.delete(allDeletePath.replace('{key}', i))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        expect(aspect.createdAt)
          .to.equal(new Date(aspect.createdAt).toISOString());
        expect(aspect.updatedAt)
          .to.equal(new Date(aspect.updatedAt).toISOString());
        done();
      });
    });
  });

  it('delete all related links', (done) => {
    api.delete(allDeletePath.replace('{key}', i))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.relatedLinks).to.have.length(ZERO);
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        expect(JSON.parse(aspect.relatedLinks)).to.have.length(ZERO);
        done();
      });
    });
  });

  it('delete one relatedLink', (done) => {
    api.delete(oneDeletePath.replace('{key}', i).replace('{akey}', 'rlink0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.relatedLinks).to.have.length(ONE);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        const rlinks = JSON.parse(aspect.relatedLinks);
        expect(rlinks).to.have.length(ONE);
        expect(rlinks).to.have.deep.property('[0].name', 'rlink1');
        done();
      });
    });
  });

  it('delete related link by name', (done) => {
    api.delete(oneDeletePath.replace('{key}', name).replace('{akey}', 'rlink0'))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.relatedLinks).to.have.length(ONE);
      expect(res.body.relatedLinks).to.have.deep.property('[0].name', 'rlink1');
      redisOps.getHashPromise(objectType.aspect, n.name)
      .then((aspect) => {
        const rlinks = JSON.parse(aspect.relatedLinks);
        expect(rlinks).to.have.length(ONE);
        expect(rlinks).to.have.deep.property('[0].name', 'rlink1');
        done();
      });
    });
  });
});
