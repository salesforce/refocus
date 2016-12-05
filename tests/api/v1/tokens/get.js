/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/tokens/get.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const adminUser = require('../../../../config').db.adminUser;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/tokens';
const expect = require('chai').expect;
const jwtUtil = require('../../../../utils/jwtUtil');

describe(`api: GET ${path}`, () => {
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );
  let tid;

  before((done) => {
    api.post('/v1/token')
    .set('Authorization', predefinedAdminUserToken)
    .send({ name: `${tu.namePrefix}Voldemort` })
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        tid = res.body.id;
        done();
      }
    });
  });

  after(u.forceDelete);

  it('not found', (done) => {
    api.get(`${path}/123-abc`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });
});
