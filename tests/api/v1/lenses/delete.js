/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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
const ZERO = 0;

describe('tests/api/v1/lenses/delete.js >', () => {
  let lensId;
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
        done();
      })
      .catch(done);
    });
    after(u.forceDelete);
    after(() => tu.toggleOverride('returnUser', false));

    it('with same name and different case succeeds', (done) => {
      api.delete(`${path}/${u.name.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(u.name);
        expect(res.body.user).to.be.an('object');
        expect(res.body.installedBy).to.equal(userId);
        done();
      });
    });
  });

  describe('with returnUser toggle off, user object should not  ' +
    'be returned: ', () => {
    beforeEach((done) => {
      u.doSetup()
      .then((lens) => {
        lensId = lens.id;
        done();
      })
      .catch(done);
    });
    afterEach(u.forceDelete);

    it('with same name and different case succeeds', (done) => {
      api.delete(`${path}/${u.name.toLowerCase()}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(u.name);
        expect(res.body.user).to.not.be.defined;
        expect(res.body.installedBy).to.not.be.defined;
        done();
      });
    });

    it('delete ok', (done) => {
      api.delete(`${path}/${lensId}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.isDeleted).to.not.equal(ZERO);
        expect(res.body.user).to.not.be.defined;
        expect(res.body.installedBy).to.not.be.defined;
        done();
      });
    });
  });
});

