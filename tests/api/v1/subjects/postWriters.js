/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/postWriters.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const Subject = tu.db.Subject;
const User = tu.db.User;
const postWritersPath = '/v1/subjects/{key}/writers';

describe('api: aspects: post writers', () => {
  let subject;
  let token;
  const userNameArray = [];

  const subjectToCreate = {
    name: `${tu.namePrefix}NorthAmerica`,
    description: 'continent',
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
    Subject.create(subjectToCreate)
    .then((sub) => {
      subject = sub;
    }).then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne())
    .then((usr) => {
      userNameArray.push(usr.name);
    })
    .then(() => tu.createSecondUser())
    .then((secUsr) => {
      userNameArray.push(secUsr.name);
      return tu.createThirdUser();
    })
    .then((tUsr) => {
      userNameArray.push(tUsr.name);

      /*
       * third user is added to make sure users are not given write
       * permission twice
       */
      return subject.addWriter(tUsr);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('add writers to the record and make sure the writers are ' +
      'associated with the right object', (done) => {
    api.post(postWritersPath.replace('{key}', subject.id))
    .set('Authorization', token)
    .send(userNameArray)
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.body).to.have.length(2);

      const userOne = res.body[0];
      const userTwo = res.body[1];

      expect(userOne.subjectId).to.not.equal(undefined);
      expect(userOne.userId).to.not.equal(undefined);

      expect(userTwo.subjectId).to.not.equal(undefined);
      expect(userTwo.userId).to.not.equal(undefined);
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });

  it('a request body that is not an array should not be accepted', (done) => {
    const userName = 'userName';
    api.post(postWritersPath.replace('{key}', subject.id))
    .set('Authorization', token)
    .send({ userName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return done();
    });
  });
});
