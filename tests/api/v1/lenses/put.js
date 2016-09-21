/**
 * tests/api/v1/lenses/put.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;

describe(`api: PUT ${path}`, () => {
  let lensId;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    u.doSetup()
    .then((lens) => {
      lensId = lens.id;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update description', (done) => {
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .field('description', 'changed description')
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.description).to.equal('changed description');
      return done();
    });
  });

  it('isPublished set to default', (done) => {
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.isPublished).to.not.be.true;
      return done();
    });
  });

  it('name overwritten by sourceName', (done) => {
    api.put(`${path}/${lensId}`)
    .set('Authorization', token)
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(res.body.sourceName);
      return done();
    });
  });
});
