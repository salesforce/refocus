/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/botData/patchWithoutPerms.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const tu = require('../../../testUtils');
const Op = require('sequelize').Op;
const r = require('../rooms/utils');
const rt = require('../roomTypes/utils');
const b = require('../bots/utils');
const Room = tu.db.Room;
const User = tu.db.User;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotData = tu.db.BotData;
const path = '/v1/botData';
const expect = require('chai').expect;
const pfx = '___';

describe('tests/api/v1/botData/patchWithoutPerms.js >', () => {
  let testBotData;
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
    testBotData = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotData.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotData.botId = bot.id;
      return BotData.create(testBotData);
    })
    .then((botData) => {
      testBotData = botData;
      return BotData.findOne({ where: { name: { [Op.iLike]: testBotData.name } } });
    })
    .then((rt) => rt.addWriters(user))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('deleting BotData without permission should return 403', (done) => {
    api.patch(`${path}/${testBotData.id}`)
    .set('Authorization', invalidToken)
    .send({
      value: 'lemons',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('deleting BotData with permission should return 200', (done) => {
    api.patch(`${path}/${testBotData.id}`)
    .set('Authorization', validToken)
    .send({
      value: 'apples',
    })
    .expect(constants.httpStatus.OK)
    .end(done);
  });
});
