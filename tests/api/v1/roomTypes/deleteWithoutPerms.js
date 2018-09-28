/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/roomTypes/deleteWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/roomTypes';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const User = tu.db.User;
const Op = require('sequelize').Op;
const pfx = '___';

describe('tests/api/v1/roomTypes/deleteWithoutPerms.js >', () => {
  let testRoomType;
  let validToken;
  let invalidToken;
  let user;

  before((done) => {
    tu.createUser('myUniqueValidUser')
    .then((usr) => tu.createTokenFromUserName(usr.name))
    .then((tkn) => {
      validToken = tkn;
    }).then(() => tu.createUser('myUniqueInvUser'))
    .then((usr2) => tu.createTokenFromUserName(usr2.name))
    .then((tkn) => {
      invalidToken = tkn;
      done();
    })
    .catch(done);
  });

  before((done) => {
    User.findOne({ where: { name: pfx + 'myUniqueValidUser' } })
    .then((usr) => {
      user = usr;
      return u.createStandard();
    })
    .then((newRoomType) => {
      testRoomType = newRoomType;
      return tu.db.RoomType.findOne({ where: { name: { [Op.iLike]: testRoomType.name } } });
    })
    .then((rt) => rt.addWriters(user))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting roomType without permission should return 403', (done) => {
    api.delete(`${path}/${testRoomType.id}`)
    .set('Authorization', invalidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('deleting roomType with permission should return 200', (done) => {
    api.delete(`${path}/${testRoomType.id}`)
    .set('Authorization', validToken)
    .expect(constants.httpStatus.OK)
    .end(done);
  });

});
