/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/post.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const path = '/v1/profiles';
const expect = require('chai').expect;
const ZERO = 0;

const jwtUtil = require('../../../../utils/jwtUtil');
const adminUser = require('../../../../config').db.adminUser;


describe(`api: POST ${path}`, () => {

  let token;
  
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  describe('POST profile', () => {
    it('Pass, post profile', (done) => {
      const p0 = { name: `${tu.namePrefix}TestProfile` };

      api.post(`${path}`)
      .set('Authorization', predefinedAdminUserToken)
      .send(p0)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(p0.name);
        done();
      });
    });
  });

});