/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/getWriters.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Aspect = tu.db.Aspect;
const User = tu.db.User;
const getWritersPath = '/v1/aspects/{key}/writers';

describe('api: aspects: get writers}', () => {
  let token;
  let aspect;
  const aspectToCreate = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
  };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aspect = asp;
    }).then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne())
    .then((usr) => aspect.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => aspect.addWriter(secUsr))
    .then(() => done())
    .catch((err) => done(err));
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers that have writer permission'
     + 'associated with the model', (done) => {
    api.get(getWritersPath.replace('{key}', aspect.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('find Writers and make sure they are sorted by username', (done) => {
    api.get(getWritersPath.replace('{key}', aspect.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(2);
      const firstUserName = res.body[0].name;
      const secondUserName = res.body[1].name;
      expect(firstUserName < secondUserName).to.equal(true);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
