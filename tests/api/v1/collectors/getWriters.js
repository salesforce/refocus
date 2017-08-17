/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/getWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Collector = tu.db.Collector;
const User = tu.db.User;
const path = '/v1/collectors/{key}/writers';
const writerPath = '/v1/collectors/{key}/writers/{userNameOrId}';

describe('tests/api/v1/collectors/getWriters.js >', () => {
  let token;
  let coll;
  let user;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Collector.create(u.toCreate)
    .then((c) => {
      coll = c;
    }).then(() => User.findOne())
    .then((usr) => coll.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      coll.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => tu.createThirdUser())
    .then((tUsr) => coll.addWriter(tUsr))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find writers', (done) => {
    api.get(path.replace('{key}', coll.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(3);
    })
    .end(done);
  });

  it('find writer by username', (done) => {
    api.get(writerPath.replace('{key}', coll.name)
      .replace('{userNameOrId}', user.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.name).to.contain('User');
    })
    .end(done);
  });
});
