/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/get.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const path = '/v1/samples';
const expect = require('chai').expect;

describe(`api::redisEnabled::GET ${path}`, () => {
  let token;
  const s1s2a1 = '___Subject1.___Subject2|___Aspect1';
  const s1s2a2 = '___Subject1.___Subject2|___Aspect2';
  const s1s3a1 = '___Subject1.___Subject3|___Aspect1';

  before((done) => {
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before(rtu.populateRedis);
  after(rtu.forceDelete);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('basic get all, sorted lexicographically by default', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].name).to.be.equal(s1s2a1);
      expect(res.body[1].name).to.be.equal(s1s2a2);
      expect(res.body[2].name).to.be.equal(s1s3a1);
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[0].value).to.be.equal('0');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      expect(res.body[0].relatedLinks).to.be.eql([
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ]);
      done();
    });
  });

  it('get all, with sort option, default asc', (done) => {
    api.get(`${path}?sort=status,value`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[1].status).to.be.equal('Invalid');
      expect(res.body[2].status).to.be.equal('OK');
      expect(res.body[0].value).to.be.equal('0');
      expect(res.body[1].value).to.be.equal('5');
      expect(res.body[2].value).to.be.equal('50');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      done();
    });
  });

  it('get all, with sort option, default desc', (done) => {
    api.get(`${path}?sort=-status,value`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].status).to.be.equal('OK');
      expect(res.body[1].status).to.be.equal('Invalid');
      expect(res.body[2].status).to.be.equal('Critical');
      expect(res.body[0].value).to.be.equal('50');
      expect(res.body[1].value).to.be.equal('5');
      expect(res.body[2].value).to.be.equal('0');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect2');
      done();
    });
  });

  it('get all with fields filter', (done) => {
    api.get(`${path}?fields=name,status`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].name).to.be.equal(s1s2a1);
      expect(res.body[1].name).to.be.equal(s1s2a2);
      expect(res.body[2].name).to.be.equal(s1s3a1);
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[0].value).to.be.undefined;
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      expect(res.body[0].relatedLinks).to.be.undefined;
      done();
    });
  });

  it('get all, with limit filter', (done) => {
    api.get(`${path}?limit=1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(1);
      expect(res.body[0].name).to.be.equal(s1s2a1);
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      done();
    });
  });

  it('get all, with offset filter', (done) => {
    api.get(`${path}?offset=1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(2);
      expect(res.body[0].name).to.be.equal(s1s2a2);
      expect(res.body[1].name).to.be.equal(s1s3a1);
      done();
    });
  });

  it('get all, with name filter', (done) => {
    api.get(`${path}?name=___Subject1.___Subject2*&status=*cal`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(1);
      expect(res.body[0].name).to.be.equal(s1s2a1);
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      done();
    });
  });

  it('get all, with combined filters', (done) => {
    const filterstr = 'limit=5&offset=1&name=___Subject1.___Subject2*&' +
    'sort=-value,status&fields=name,status,value';
    api.get(`${path}?${filterstr}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(1);
      expect(res.body[0].name).to.be.equal(s1s2a1);
      expect(res.body[0].status).to.be.equal('Critical');
      expect(res.body[0].aspect.name).to.be.equal('___Aspect1');
      expect(res.body[0].relatedLinks).to.be.undefined;
      expect(res.body[0].value).to.be.equal('0');
      done();
    });
  });

  it('basic get by name, OK', (done) => {
    const sampleName = s1s3a1;
    api.get(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.be.equal(s1s3a1);
      expect(res.body.status).to.be.equal('Invalid');
      expect(res.body.value).to.be.equal('5');
      expect(res.body.relatedLinks).to.be.eql([
        { name: 'Salesforce', value: 'http://www.salesforce.com' },
      ]);
      expect(res.body.apiLinks).to.be.eql([
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'DELETE',
          rel: 'Delete this sample',
        },
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'GET',
          rel: 'Retrieve this sample',
        },
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'PATCH',
          rel: 'Update selected attributes of this sample',
        },
        { href: '/v1/samples',
          method: 'POST',
          rel: 'Create a new sample',
        },
        { href: '/v1/samples/___Subject1.___Subject3|___Aspect1',
          method: 'PUT',
          rel: 'Overwrite all attributes of this sample',
        },
      ]);
      expect(res.body.aspect.name).to.be.equal('___Aspect1');
      expect(res.body.aspect.relatedLinks).to.be.eql([
        { name: 'Google', value: 'http://www.google.com' },
        { name: 'Yahoo', value: 'http://www.yahoo.com' },
      ]);
      expect(res.body.aspect.criticalRange).to.be.eql([0, 1]);
      done();
    });
  });

  it('get by name, wrong name', (done) => {
    const sampleName = 'abc';
    api.get(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].description).to.be.equal('Incorrect sample name.');
      return done();
    });
  });

  it('get by name, sample not found', (done) => {
    const sampleName = 'abc|xyz';
    api.get(`${path}/${sampleName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].description).to.be.equal('Sample/Aspect not found.');
      return done();
    });
  });

  it('get by name, with fields filter', (done) => {
    const sampleName = s1s3a1;
    api.get(`${path}/${sampleName}?fields=name,value`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.be.equal(s1s3a1);
      expect(res.body.status).to.be.undefined;
      expect(res.body.value).to.be.equal('5');
      expect(res.body.relatedLinks).to.be.undefined;
      expect(res.body).to.have.property('apiLinks').that.is.an('array');
      expect(res.body.aspect.name).to.be.equal('___Aspect1');
      expect(res.body.aspect.relatedLinks).to.be.eql([
        { name: 'Google', value: 'http://www.google.com' },
        { name: 'Yahoo', value: 'http://www.yahoo.com' },
      ]);
      expect(res.body.aspect.criticalRange).to.be.eql([0, 1]);
      done();
    });
  });

  it('get by name with incorrect fields filter gives error', (done) => {
    const sampleName = s1s3a1;
    api.get(`${path}/${sampleName}?fields=name,y`)
    .set('Authorization', token)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});