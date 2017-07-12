/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/subjects/getAll.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const path = '/v1/subjects';
const expect = require('chai').expect;

describe(`api::redisEnabled::GET ${path}`, () => {
  let token;
  const subject1 = '___Subject1';
  const subject2 = '___Subject1.___Subject2';
  const subject3 = '___Subject1.___Subject3';

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
  after(rtu.flushRedis);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('updatedAt and createdAt fields have the expected format', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      for (let i = res.body.length - 1; i >= 0; i--) {
        const { updatedAt, createdAt } = res.body[i];
        expect(createdAt).to.equal(new Date(createdAt).toISOString());
        expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
      }
      done();
    });
  });

  it('basic get all, sorted lexicographically by default', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('get all, with sort option, default asc', (done) => {
    api.get(`${path}?sort=absolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('get all, with sort option, default desc', (done) => {
    api.get(`${path}?sort=-absolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject3);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('get all with fields filter returns in the asc order', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].name).to.be.equal(subject1);

      // name is in absolutePath
      expect(res.body[1].name).to.be.equal(subject2.substr(subject1.length + 1));
      expect(res.body[2].name).to.be.equal(subject3.substr(subject1.length + 1));
      done();
    });
  });

  it('get all with fields filter returns expected number of keys', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(Object.keys(res.body[0]).length).to.equal(3);
      expect(Object.keys(res.body[1])).to.contain('id', 'name', 'apiLinks');
      done();
    });
  });

  it('get all with fields filter returns apiLinks', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(Array.isArray(res.body[0].apiLinks)).to.be.true;
      expect(Array.isArray(res.body[1].apiLinks)).to.be.true;
      expect(Array.isArray(res.body[2].apiLinks)).to.be.true;
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
      expect(res.body[0].name).to.be.equal(subject1);
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
      expect(res.body[0].absolutePath).to.be.equal(subject2);
      expect(res.body[1].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('get all, with name filter', (done) => {
    api.get(`${path}?name=___Subject1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(1);
      expect(res.body[0].name).to.be.equal(subject1);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('get all, with combined filters', (done) => {
    const filterstr = 'limit=2&offset=1&name=___*&' +
    'sort=-name&fields=name,absolutePath';
    api.get(`${path}?${filterstr}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.be.equal(2);
      expect(res.body[0].absolutePath).to.be.equal(subject2);
      expect(res.body[1].absolutePath).to.be.equal(subject1);
      expect(Object.keys(res.body[1])).to.contain('name', 'absolutePath');
      done();
    });
  });

  it('trailing asterisk is treated as "starts with"', (done) => {
    api.get(path + '?name=' + tu.namePrefix + '*')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('leading asterisk is treated as "ends with"', (done) => {
    api.get(path + '?name=*___Subject1')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('leading and trailing asterisks are treated as "contains"', (done) => {
    api.get(path + '?name=*2*')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].absolutePath).to.be.equal(subject2);
      done();
    });
  });
});
