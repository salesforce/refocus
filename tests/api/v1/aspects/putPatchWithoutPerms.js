/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/aspects/putPatchWithoutPerms.js
 */

'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const User = tu.db.User;
const path = '/v1/aspects';

describe('api: aspects:', () => {
  // let token;
  let aspect;
  let otherValidToken;
  // let user;

  const n = {
    name: `${tu.namePrefix}ASPECTNAME`,
    timeout: '110s',
  };

  before((done) => {
    tu.createToken()
    .then(() => {
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create(n)
    .then((asp) => {
      aspect = asp;
    })
    .then(() =>

      /**
       * tu.createToken creates an user and an admin user is already created,
       * so one use of these.
       */
      User.findOne({ where: { name: tu.userName } }))
    .then((usr) => {
      return aspect.addWriter(usr);
    })
    .then(() => tu.createUser('myUNiqueUser'))
    .then((_usr) => tu.createTokenFromUserName(_usr.name))
    .then((tkn) => {
      otherValidToken = tkn;
      done();
    })
    .catch(done);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('PUT without permission: should return 403', (done) => {
    const toPut = {
      name: `${tu.namePrefix}newName`,
      timeout: '220s',
    };
    api.put(`${path}/${aspect.id}`)
    .set('Authorization', otherValidToken)
     .send(toPut)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res */) => {
      return err ? done(err) : done();
    });
  });

  it('PATCH without permission: should return 403', (done) => {
    const toPatch = {
      tags: ['tags']
    };
    api.patch(`${path}/${aspect.id}`)
    .set('Authorization', otherValidToken)
    .send(toPatch)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res */) => {
      return err ? done(err) : done();
    });
  });
});

