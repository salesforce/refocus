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

describe('tests/cache/models/subjects/getAll.js, ' +
`api::redisEnabled::GET ${path}`, () => {
  let token;
  const subject1 = '___Subject1';
  const subject2 = '___Subject1.___Subject2';
  const subject3 = '___Subject1.___Subject3';

  before((done) => {
    tu.toggleOverride('getSubjectFromCache', true);
    tu.toggleOverride('enableRedisSampleStore', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before(rtu.populateRedis);
  after(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));
  after(() => tu.toggleOverride('getSubjectFromCache', false));

  it('date and numeric fields have the expected format', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      for (let i = res.body.length - 1; i >= 0; i--) {
        const { updatedAt, createdAt, childCount, hierarchyLevel } =
          res.body[i];

        expect(childCount).to.be.an('number');
        expect(hierarchyLevel).to.be.an('number');
        expect(createdAt).to.equal(new Date(createdAt).toISOString());
        expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
      }

      done();
    });
  });

  it('sorted lexicographically by absolutePath by default', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('sort option asc', (done) => {
    api.get(`${path}?sort=absolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('sort option asc with parentAbsolutePath', (done) => {
    api.get(`${path}?sort=parentAbsolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].parentAbsolutePath).to.be.equal(subject1);
      expect(res.body[1].parentAbsolutePath).to.be.equal(subject1);
      expect(res.body[2].parentAbsolutePath).to.equal('');
      done();
    });
  });

  it('sort option desc', (done) => {
    api.get(`${path}?sort=-absolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject3);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('sort option desc with parentAbsolutePath', (done) => {
    api.get(`${path}?sort=-parentAbsolutePath`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].parentAbsolutePath).to.equal('');
      expect(res.body[1].parentAbsolutePath).to.be.equal(subject1);
      expect(res.body[2].parentAbsolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('fields filter returns in the asc order', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(res.body[0].name).to.be.equal(subject1);

      // name is in absolutePath
      expect(res.body[1].name)
      .to.be.equal(subject2.substr(subject1.length + 1));
      expect(res.body[2].name)
      .to.be.equal(subject3.substr(subject1.length + 1));
      done();
    });
  });

  it('fields filter returns expected number of keys', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(Object.keys(res.body[0]).length).to.equal(3);
      expect(Object.keys(res.body[1])).to.contain('id', 'name', 'apiLinks');
      done();
    });
  });

  it('fields filter returns apiLinks', (done) => {
    api.get(`${path}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(3);
      expect(Array.isArray(res.body[0].apiLinks)).to.be.true;
      expect(Array.isArray(res.body[1].apiLinks)).to.be.true;
      expect(Array.isArray(res.body[2].apiLinks)).to.be.true;
      done();
    });
  });

  it('limit filter', (done) => {
    api.get(`${path}?limit=1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(1);
      expect(res.body[0].name).to.be.equal(subject1);
      done();
    });
  });

  it('offset filter', (done) => {
    api.get(`${path}?offset=1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(2);
      expect(res.body[0].absolutePath).to.be.equal(subject2);
      expect(res.body[1].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('name filter', (done) => {
    api.get(`${path}?name=___Subject1`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.be.equal(1);
      expect(res.body[0].name).to.be.equal(subject1);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('combined filters', (done) => {
    const filterstr = 'limit=2&offset=1&name=___*&' +
    'sort=-name&fields=name,absolutePath';
    api.get(`${path}?${filterstr}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
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
        return done(err);
      }

      expect(res.body.length).to.equal(3);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      expect(res.body[1].absolutePath).to.be.equal(subject2);
      expect(res.body[2].absolutePath).to.be.equal(subject3);
      done();
    });
  });

  it('leading asterisk is treated as "ends with" for name', (done) => {
    api.get(path + '?name=*___Subject1')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].absolutePath).to.be.equal(subject1);
      done();
    });
  });

  it('leading asterisk is treated as "ends with" for absolutePath', (done) => {
    api.get(path + '?absolutePath=*___Subject1')
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
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
        return done(err);
      }

      expect(res.body.length).to.equal(1);
      expect(res.body[0].absolutePath).to.be.equal(subject2);
      done();
    });
  });
});
