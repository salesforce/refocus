/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/postWriters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const User = tu.db.User;
const postWritersPath = '/v1/lenses/{key}/writers';

describe('tests/api/v1/lenses/postWriters.js >', () => {
  let lens;
  let token;
  let otherValidToken;
  const userNameArray = [];

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.doSetup()
    .then((lensInst) => {
      lens = lensInst;
    })
    /*
     * tu.createToken creates a user and an admin user is already created so
     * use one of these.
     */
    .then(() => User.findOne({ where: { name: tu.userName } }))
    .then((usr) => {
      userNameArray.push(usr.name);
      /*
       * user is added to make sure users are not given write
       * permission twice
       */
      return lens.addWriter(usr);
    })
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      userNameArray.push(secUsr.name);
      return tu.createThirdUser();
    })
    .then((tUsr) => {
      userNameArray.push(tUsr.name);
      return tu.createUser('myUNiqueUser');
    })
    .then((fusr) => tu.createTokenFromUserName(fusr.name))
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
    api.post(postWritersPath.replace('{key}', lens.id))
    .set('Authorization', token)
    .send(userNameArray)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body).to.have.length(2);
      const userOne = res.body[0];
      const userTwo = res.body[1];
      expect(userOne.lensId).to.not.equal(undefined);
      expect(userOne.userId).to.not.equal(undefined);
      expect(userTwo.lensId).to.not.equal(undefined);
      expect(userTwo.userId).to.not.equal(undefined);
    })
    .end(done);
  });

  it('return 403 for adding writers using an user that is not ' +
    'already a writer of that resource', (done) => {
    api.post(postWritersPath.replace('{key}', lens.id))
    .set('Authorization', otherValidToken)
    .send(userNameArray)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('a request body that is not an array should not be accepted', (done) => {
    const userName = 'userName';
    api.post(postWritersPath.replace('{key}', lens.id))
    .set('Authorization', token)
    .send({ userName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });
});
