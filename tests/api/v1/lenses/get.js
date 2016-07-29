/**
 * tests/api/v1/lenses/get.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;

describe(`api: GET ${path}`, () => {
  let lensId;
  let lensName;
  const token = tu.createToken();

  before((done) => {
    u.doSetup()
    .then((lens) => {
      lensId = lens.id;
      lensName = lens.name;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('basic get', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.length(1);
      expect(res.body).to.have.deep.property('[0].id');
      expect(res.body).to.not.have.deep.property('[0].library');
      expect(res.body).to.have.deep.property('[0].name', 'testLensName');

      return done();
    });
  });

  it('basic get by id', (done) => {
    api.get(`${path}/${lensId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal('testLensName');
      expect(res.body.sourceName).to.equal('testSourceLensName');
      expect(res.body.library['lens.js']).to.exist;
      expect(res.body.library['lens.json']).to.exist;

      return done();
    });
  });

  it('basic get by name', (done) => {
    api.get(`${path}/${lensName}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.sourceName).to.equal('testSourceLensName');
      return done();
    });
  });
});
