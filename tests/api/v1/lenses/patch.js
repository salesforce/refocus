/**
 * tests/api/v1/lenses/patch.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;

describe(`api: PATCH ${path}`, () => {
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

  it('patch name', (done) => {
    api.patch(`${path}/${lensId}`)
    .set('Authorization', token)
    .send({ name: 'changedName' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal('changedName');
      return done();
    });
  });

  it('update description', (done) => {
    api.patch(`${path}/${lensId}`)
    .set('Authorization', token)
    .send({ description: 'changed description' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.description).to.equal('changed description');
      return done();
    });
  });

  it('overwrite description if empty', (done) => {
    api.get(`${path}/${lensId}`)
    .set('Authorization', token)
    .send({ description: '' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.sourceDescription).to.equal('test Source Description');
      return done();
    });
  });

  it('patch isPublished', (done) => {
    api.patch(`${path}/${lensId}`)
    .set('Authorization', token)
    .send({ isPublished: false })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.isPublished).to.equal(false);
      return done();
    });
  });
});
