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
const getWriterPath = '/v1/aspects/{key}/writers/{userNameOrId}';

describe('tests/api/v1/aspects/getWriters.js >', () => {
  let token;
  let aspect;
  let user;
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
    .catch(done);
  });

  before((done) => {
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aspect = asp;
    })
    /*
     * tu.createToken creates a user and an admin user is already created,
     * so use one of these.
     */
    .then(() => User.findOne())
    .then((usr) => aspect.addWriter(usr))
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      aspect.addWriter(secUsr);
      user = secUsr;
    })
    .then(() => tu.createThirdUser())
    .then((tUsr) => aspect.addWriter(tUsr))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('find Writers that have writer permission'
     + 'associated with the model', (done) => {
    api.get(getWritersPath.replace('{key}', aspect.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(3);
    })
    .end(done);
  });

  it('find Writers and make sure the passwords are not returned', (done) => {
    api.get(getWritersPath.replace('{key}', aspect.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.length(3);

      const firstUser = res.body[0];
      const secondUser = res.body[1];
      const thirdUser = res.body[2];

      expect(firstUser.password).to.equal(undefined);
      expect(secondUser.password).to.equal(undefined);
      expect(thirdUser.password).to.equal(undefined);

      // TODO: see why sort by username fails on travis
    })
    .end(done);
  });

  it('find Writer by username', (done) => {
    api.get(getWriterPath.replace('{key}', aspect.name)
      .replace('{userNameOrId}', user.name))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('name', user.name);
    })
    .end(done);
  });

  it('find Writer by userId', (done) => {
    api.get(getWriterPath.replace('{key}', aspect.name)
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('id', user.id);
    })
    .end(done);
  });

  it('Writer not found for invalid resource but valid writers', (done) => {
    api.get(getWriterPath.replace('{key}', 'invalidresource')
      .replace('{userNameOrId}', user.id))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });

  it('Writer not found for invalid username', (done) => {
    api.get(getWriterPath.replace('{key}', aspect.name)
      .replace('{userNameOrId}', 'invalidUser'))
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });
});
