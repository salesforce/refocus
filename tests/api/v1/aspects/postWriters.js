/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/postWriters.js
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
const postWritersPath = '/v1/aspects/{key}/writers';

describe('tests/api/v1/aspects/postWriters.js >', () => {
  let token;
  let aspect;
  let firstUser;
  let secondUser;
  let otherValidToken;
  const userNameArray = [];
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
     * tu.createToken creates a user and an admin user is already created so
     * use one of these.
     */
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => {
      firstUser = usr;
      userNameArray.push(firstUser.name);
      return tu.createSecondUser();
    })
    .then((secUsr) => {
      secondUser = secUsr;
      userNameArray.push(secondUser.name);
      return tu.createThirdUser();
    })
    .then((tUsr) => tu.createTokenFromUserName(tUsr.name))
    .then((tkn) => {
      otherValidToken = tkn;
    })
    .then(() => done())
    .catch(done);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('add writers to the record and make sure the writers are ' +
  'associated with the right object', (done) => {
    api.post(postWritersPath.replace('{key}', aspect.id))
    .set('Authorization', token)
    .send(userNameArray)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body).to.have.length(2);

      const userOne = res.body[0];
      const userTwo = res.body[1];

      expect(userOne.aspectId).to.not.equal(undefined);
      expect(userOne.userId).to.not.equal(undefined);

      expect(userTwo.aspectId).to.not.equal(undefined);
      expect(userTwo.userId).to.not.equal(undefined);
    })
    .end(done);
  });

  it('return 403 for adding writers using an user that is not ' +
  'already a writer of that resource', (done) => {
    api.post(postWritersPath.replace('{key}', aspect.id))
    .set('Authorization', otherValidToken)
    .send(userNameArray)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('a request body that is not an array should not be accepted', (done) => {
    const firstUserName = firstUser.name;
    api.post(postWritersPath.replace('{key}', aspect.id))
    .set('Authorization', token)
    .send({ firstUserName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });
});
