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
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('tests/api/v1/lenses/get.js >', () => {
  let lensId;
  let lensName;
  let token;
  let userId;

  before((done) => {
    tu.createUserAndToken()
    .then((obj) => {
      userId = obj.user.id;
      token = obj.token;
      done();
    })
    .catch(done);
  });
  after(tu.forceDeleteUser);

  describe('user object should be returned >', () => {
    before((done) => {
      u.createBasic({ installedBy: userId })
      .then((lens) => {
        expect(lens.installedBy).to.equal(userId);
        lensId = lens.id;
        lensName = lens.name;
        done();
      })
      .catch(done);
    });
    after(u.forceDelete);

    it('get all', (done) => {
      api.get(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.length(ONE);
        const obj = res.body[0];
        expect(obj.id).to.be.an('string');
        expect(obj.name).to.equal(`${tu.namePrefix}testLensName`);
        expect(obj.library).to.be.defined;
        expect(obj.user.id).to.equal(userId);
        expect(obj).to.have.property('lensEventApiVersion', 1);
        done();
      });
    });

    it('get by id', (done) => {
      api.get(`${path}/${lensId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        const obj = res.body;
        expect(obj.name).to.equal(`${tu.namePrefix}testLensName`);
        expect(obj.sourceName).to.equal('testSourceLensName');
        expect(obj.library['lens.js']).to.exist;
        expect(obj.library['lens.json']).to.exist;
        expect(obj.user).to.be.an('object');
        expect(obj.user.id).to.equal(userId);
        done();
      });
    });

    it('get with fields query param', (done) => {
      api.get(`${path}/${lensId}?fields=name,lensEventApiVersion`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const obj = res.body;
          console.log(obj);
          expect(obj).to.have.property('name', `${tu.namePrefix}testLensName`);
          expect(obj).to.have.property('lensEventApiVersion', 1);
          expect(obj).to.not.have.property('library');
          expect(obj).to.not.have.property('user');
          expect(obj).to.not.have.property('sourceName');
          done();
        });
    });
  });
});

