/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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
      lensName = lens.name;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

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
      expect(res.body).to.have.deep.property('[0].name', `${tu.namePrefix}testLensName`);

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

      expect(res.body.name).to.equal(`${tu.namePrefix}testLensName`);
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

  it('Error if lens is not published', (done) => {
    api.patch(`${path}/${lensName}`)
    .set('Authorization', token)
    .send({ isPublished: false })
    .end((_err) => {
      if (_err) {
        return done(_err);
      }

      api.get(`${path}/${lensName}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[0].description).to.equal('Lens is not published. Please contact Refocus admin.');
        return done();
      });
    });
  });
});
