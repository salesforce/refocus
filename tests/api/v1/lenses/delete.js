/**
 * tests/api/v1/lenses/delete.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;

describe(`api: DELETE ${path}`, () => {
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

  it('delete ok', (done) => {
    api.delete(`${path}/${lensId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.isDeleted).to.not.equal(0);
      return done();
    });
  });
});
