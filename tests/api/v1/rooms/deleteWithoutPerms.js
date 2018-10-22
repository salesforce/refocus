/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/rooms/deleteWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const tu = require('../../../testUtils');
const Op = require('sequelize').Op;
const rt = require('../roomTypes/utils');
const Room = tu.db.Room;
const User = tu.db.User;
const RoomType = tu.db.RoomType;
const path = '/v1/rooms';
const expect = require('chai').expect;
const pfx = '___';

describe('tests/api/v1/rooms/deleteWithoutPerms.js >', () => {
  let testRoom;
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
    })
    .then(() => done())
    .catch(done);
  });

  before((done) => {
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = u.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((newRoom) => {
      testRoom = newRoom;
      return Room.findOne({ where: { name: { [Op.iLike]: testRoom.name } } });
    })
    .then((room) => room.addWriters(user))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting room without permission should return 403', (done) => {
    api.delete(`${path}/${testRoom.id}`)
    .set('Authorization', invalidToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('deleting room with permission should return 200', (done) => {
    api.delete(`${path}/${testRoom.id}`)
    .set('Authorization', validToken)
    .expect(constants.httpStatus.OK)
    .end(done);
  });
});
