/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/patch.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;

describe('tests/api/v1/lenses/patch.js >', () => {
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

  describe('user object should be returned: ', () => {
    before((done) => {
      u.createBasic({ installedBy: userId })
      .then((lens) => {
        expect(lens.installedBy).to.equal(userId);
        lensId = lens.id;
        done();
      })
      .catch(done);
    });
    after(u.forceDelete);

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
        expect(res.body.user).to.be.an('object');
        expect(res.body).to.have.property('lensEventApiVersion', 1);
        expect(res.body.user.id).to.equal(userId);
        done();
      });
    });
  });
});
