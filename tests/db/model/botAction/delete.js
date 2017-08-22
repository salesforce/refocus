/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/botAction/delete.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const r = require('../room/utils');
const rt = require('../roomType/utils');
const b = require('../bot/utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotAction = tu.db.BotAction;

describe('tests/db/model/botAction/delete.js >', () => {
  beforeEach((done) => {
    const testBotAction = u.getStandard();
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotAction.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotAction.botId = bot.id;
      return BotAction.create(testBotAction);
    })
    .then(() => {
      testBotAction.name = 'Action2';
      return BotAction.create(testBotAction);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, bot action delete first data', (done) => {
    BotAction.destroy({ where: { name: 'Action1' } })
    .then(() => BotAction.findAll())
    .then((o) => {
      expect(o.length).to.equal(1);
      expect(o[0]).to.have.property('name').to.equal('Action2');
      done();
    })
    .catch(done);
  });
});
