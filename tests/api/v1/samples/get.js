/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const path = '/v1/samples';
const expect = require('chai').expect;
const ZERO = 0;
const redisCache = require('../../../../cache/redisCache').client.cache;
const featureToggles = require('feature-toggles');
const cacheGetSamplesByNameWildcard =
  featureToggles.isFeatureEnabled('cacheGetSamplesByNameWildcard');

describe(`tests/api/v1/samples/get.js, GET ${path} >`, () => {
  let sampleName;
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
    u.doSetup()
    .then((samp) => Sample.create(samp))
    .then((samp) => {
      sampleName = samp.name;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('apiLinks in basic get end  with sample name', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      let href = '';
      for (let i = res.body.length - 1; i >= 0; i--) {
        const apiLinks = res.body[i].apiLinks;
        for (let j = apiLinks.length - 1; j >= 0; j--) {
          href = apiLinks[j].href;
          if (apiLinks[j].method != 'POST') {
            expect(href.split('/').pop()).to.equal(u.sampleName);
          } else {
            expect(href).to.equal(path);
          }
        }
      }
    })
    .end(done);
  });

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, ZERO)) {
        throw new Error('expecting sample');
      }

      if (res.body[ZERO].status !== constants.statuses.Critical) {
        throw new Error('Incorrect Status Value');
      }
    })
    .end(done);
  });

  it('get with wildcard and with cacheGetSamplesWildcard flag on ' +
    'shold cache response', (done) => {
    tu.toggleOverride('cacheGetSamplesByNameWildcard', true);
    api.get(`${path}?name=${sampleName}*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get(`${sampleName}*`, (cacheErr, reply) => {
        if (cacheErr || !reply) {
          return done(cacheErr);
        }

        expect(JSON.parse(reply).length).to.be.above(ZERO);
        expect(JSON.parse(reply)[0].name).to.equal(`${sampleName}`);
        redisCache.del(`${sampleName}*`);

        tu.toggleOverride('cacheGetSamplesByNameWildcard',
          cacheGetSamplesByNameWildcard);
        done();
      });
    });
  });

  it('get without wildcard and with cacheGetSamplesWildcard flag on ' +
    'shold not cache response', (done) => {
    tu.toggleOverride('cacheGetSamplesByNameWildcard', true);
    api.get(`${path}?name=${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get(`${sampleName}`, (cacheErr, reply) => {
        if (cacheErr || !reply) {
          expect(res.body.length).to.be.above(ZERO);

          tu.toggleOverride('cacheGetSamplesByNameWildcard',
          cacheGetSamplesByNameWildcard);
          done();
        }
      });
    });
  });

  it('get with wildcard and without cacheGetSamplesWildcard flag on ' +
    'should not cache response', (done) => {
    tu.toggleOverride('cacheGetSamplesByNameWildcard', false);
    api.get(`${path}?name=${sampleName}*`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      redisCache.get(`${sampleName}*`, (cacheErr, reply) => {
        if (cacheErr || !reply) {
          expect(res.body.length).to.be.above(ZERO);

          tu.toggleOverride('cacheGetSamplesByNameWildcard',
          cacheGetSamplesByNameWildcard);
          done();
        }
      });
    });
  });

  it('basic get does not return id', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.above(ZERO);
      expect(res.body[0].id).to.be.undefined;
      done();
    });
  });

  it('basic get by id', (done) => {
    api.get(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, ZERO)) {
        throw new Error('expecting sample');
      }

      if (res.body.status !== constants.statuses.Critical) {
        throw new Error('Incorrect Status Value');
      }
    })
    .end(done);
  });

  it('by name is case in-sensitive', (done) => {
    const name = u.sampleName;
    api.get(`${path}/${name.toLowerCase()}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(name);
      done();
    });
  });

  it('does not return id', (done) => {
    const name = u.sampleName;
    api.get(`${path}/${name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.id).to.be.undefined;
      done();
    });
  });
});
