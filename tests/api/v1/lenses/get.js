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

  describe('with returnUser toggle on, user object should be returned: ', () => {
    before((done) => {
      tu.toggleOverride('returnUser', true);
      const lens = u.getLens({ installedBy: userId });
      u.doSetup(lens)
      .then((lens) => {
        expect(lens.installedBy).to.equal(userId);
        lensId = lens.id;
        lensName = lens.name;
        done();
      })
      .catch(done);
    });
    after(u.forceDelete);
    after(() => tu.toggleOverride('returnUser', false));

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
        expect(obj.user).to.be.an('object');
        expect(obj.installedBy).to.equal(userId);
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
        expect(obj.installedBy).to.equal(userId);
        done();
      });
    });
  });

  describe('returnUser toggle off, user object should NOT be returned: ', () => {
    before((done) => {
      u.doSetup()
      .then((lens) => {
        lensId = lens.id;
        lensName = lens.name;
        done();
      })
      .catch(done);
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

        expect(res.body).to.have.length(ONE);
        expect(res.body[0].id).to.be.an('string');
        expect(res.body[0].name).to.equal(`${tu.namePrefix}testLensName`);
        expect(res.body[0].library).to.be.defined;
        expect(res.body[0].user).to.not.be.defined;
        expect(res.body[0].installedBy).to.not.be.defined;
        done();
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

        expect(res.body.user).to.be.undefined;
        expect(res.body.name).to.equal(`${tu.namePrefix}testLensName`);
        expect(res.body.sourceName).to.equal('testSourceLensName');
        expect(res.body.library['lens.js']).to.exist;
        expect(res.body.library['lens.json']).to.exist;
        expect(res.body.user).to.not.be.defined;
        expect(res.body.installedBy).to.not.be.defined;
        done();
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

        expect(res.body.user).to.be.undefined;
        expect(res.body.sourceName).to.equal('testSourceLensName');
        expect(res.body.user).to.not.be.defined;
        expect(res.body.installedBy).to.not.be.defined;
        done();
      });
    });

    it('basic get by name with different case', (done) => {
      api.get(`${path}/${lensName.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.sourceName).to.equal('testSourceLensName');
        expect(res.body.user).to.not.be.defined;
        expect(res.body.installedBy).to.not.be.defined;
        done();
      });
    });

    it('Error if lens is not published', (done) => {
      api.patch(`${path}/${lensName}`)
      .set('Authorization', token)
      .send({ isPublished: false })
      .end((_err) => {
        if (_err) {
          done(_err);
        }

        api.get(`${path}/${lensName}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.NOT_FOUND)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors[ZERO].description)
            .to.equal('Lens is not published. Please contact Refocus admin.');
          expect(res.body.user).to.not.be.defined;
          expect(res.body.installedBy).to.not.be.defined;
          done();
        });
      });
    });
  });
});

